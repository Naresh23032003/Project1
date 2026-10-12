import { ExtractionError, extractFromText } from "@/lib/extract/run";
import { redact } from "@/lib/redact/redact";
import { getModelCall } from "@/lib/server/llm";
import { getLimiter } from "@/lib/server/ratelimit";
import { verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_CHARS = 25_000;
const MIN_CHARS = 100;
const MAX_BODY_BYTES = 120_000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// x-real-ip is set by the platform. A forwarded list can carry values the client typed.
function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

class TooLarge extends Error {}

// Reads at most `max` bytes, so a body with no declared length can't fill memory.
async function readLimited(req: Request, max: number): Promise<string> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new TooLarge();
    }
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return json(403, { error: "forbidden_origin", message: "This request didn't come from the InHand site." });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json(413, { error: "too_large", message: "That text is too long. Paste just the offer letter." });

  let payload: { text?: unknown; turnstileToken?: unknown };
  try {
    payload = JSON.parse(await readLimited(req, MAX_BODY_BYTES));
  } catch (err) {
    if (err instanceof TooLarge) return json(413, { error: "too_large", message: "That text is too long. Paste just the offer letter." });
    return json(400, { error: "bad_request", message: "The request could not be read." });
  }

  if (typeof payload.text !== "string") return json(400, { error: "bad_request", message: "No text was sent." });
  if (payload.text.length > MAX_CHARS) return json(413, { error: "too_large", message: "That text is too long. Paste just the offer letter." });
  if (payload.text.trim().length < MIN_CHARS) return json(400, { error: "too_short", message: "That looks too short to be an offer letter." });

  const ip = clientIp(req);
  const token = typeof payload.turnstileToken === "string" ? payload.turnstileToken : undefined;
  if (!(await verifyTurnstile(token, ip, { secret: process.env.TURNSTILE_SECRET_KEY }))) {
    return json(403, { error: "verification_failed", message: "We couldn't confirm you're a person. Refresh the page and try again." });
  }

  const limit = await getLimiter().hit(ip);
  if (!limit.allowed) {
    return json(429, { error: "rate_limited", message: "You've used today's decodes. Try again tomorrow." });
  }

  const model = getModelCall();
  if (!model) return json(503, { error: "not_configured", message: "Decoding isn't switched on yet." });

  // The browser already redacts. This second pass catches anything it missed.
  const text = redact(payload.text).redacted;

  try {
    const { extraction, dropped } = await extractFromText(text, model);
    return json(200, { extraction, dropped, remaining: limit.remaining });
  } catch (err) {
    const code = err instanceof ExtractionError ? err.code : "model_unavailable";
    // Log the error code only. Never log the request body or the model's answer.
    console.error("decode failed:", code);
    if (code === "not_an_offer") return json(422, { error: code, message: "We couldn't find pay details in that text. Check you pasted the full letter." });
    if (code === "invalid_model_output") return json(502, { error: code, message: "We couldn't read the result this time. Please try again." });
    return json(502, { error: "model_unavailable", message: "The decoder is busy right now. Please try again in a minute." });
  }
}
