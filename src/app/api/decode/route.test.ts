import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const letter = `Dear Candidate,
We are pleased to offer you the role of Software Engineer at Acme Technologies.
Your annual CTC is Rs. 6,00,000.
Basic salary: Rs. 20,000 per month.
You must serve a notice period of 90 days.
This offer is subject to background verification and acceptance within seven days.`;

const modelAnswer = {
  employerName: "Acme Technologies",
  jobTitle: "Software Engineer",
  location: "Bengaluru",
  stateForProfessionalTax: "KA",
  ctcAnnual: 600000,
  components: [{ label: "Basic", kind: "basic", amount: 20000, frequency: "monthly", quote: "Basic salary: Rs. 20,000 per month." }],
  pfBasis: "not_stated",
  clauses: [{ type: "notice_period", quote: "You must serve a notice period of 90 days.", days: 90 }],
  notes: [],
};

function groqResponse(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/decode", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function load(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const k of ["GROQ_API_KEY", "LLM_PROVIDER", "TURNSTILE_SECRET_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RATE_LIMIT_PER_DAY"]) delete process.env[k];
  for (const [k, v] of Object.entries({ GROQ_API_KEY: "test-key", ...env })) {
    if (v !== undefined) process.env[k] = v;
  }
  return (await import("./route")).POST;
}

describe("POST /api/decode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => groqResponse(modelAnswer)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns an extraction for a good letter", async () => {
    const POST = await load();
    const res = await POST(request({ text: letter }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.extraction.ctcAnnual).toBe(600000);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects bad JSON", async () => {
    const POST = await load();
    expect((await POST(request("not json"))).status).toBe(400);
  });

  it("rejects text that is too short", async () => {
    const POST = await load();
    expect((await POST(request({ text: "hi" }))).status).toBe(400);
  });

  it("rejects text that is too long", async () => {
    const POST = await load();
    const res = await POST(request({ text: "a".repeat(30_000) }));
    expect(res.status).toBe(413);
  });

  it("rejects an oversized body by content-length before reading it", async () => {
    const POST = await load();
    const res = await POST(request({ text: letter }, { "content-length": "500000" }));
    expect(res.status).toBe(413);
  });

  it("rejects a streamed body that goes over the limit without ever declaring its size", async () => {
    const POST = await load();
    const chunk = new TextEncoder().encode("x".repeat(50_000));
    let sent = 0;
    const body = new ReadableStream({
      pull(controller) {
        if (sent >= 10) return controller.close();
        sent++;
        controller.enqueue(chunk);
      },
    });
    const req = new Request("http://localhost/api/decode", { method: "POST", body, headers: { "content-type": "application/json" }, duplex: "half" } as RequestInit);
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(sent).toBeLessThan(10);
  });

  it("rejects requests that come from another website", async () => {
    const POST = await load();
    const res = await POST(request({ text: letter }, { origin: "https://evil.example", host: "localhost" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden_origin");
  });

  it("accepts requests from its own origin", async () => {
    const POST = await load();
    const res = await POST(request({ text: letter }, { origin: "http://localhost", host: "localhost" }));
    expect(res.status).toBe(200);
  });

  it("prefers the platform's real-ip header over a forwarded list", async () => {
    const POST = await load({ RATE_LIMIT_PER_DAY: "1" });
    expect((await POST(request({ text: letter }, { "x-real-ip": "5.5.5.5", "x-forwarded-for": "1.1.1.1" }))).status).toBe(200);
    // same real address, different spoofed forwarded value: still limited
    expect((await POST(request({ text: letter }, { "x-real-ip": "5.5.5.5", "x-forwarded-for": "2.2.2.2" }))).status).toBe(429);
  });

  it("blocks after the daily limit", async () => {
    const POST = await load({ RATE_LIMIT_PER_DAY: "2" });
    expect((await POST(request({ text: letter }))).status).toBe(200);
    expect((await POST(request({ text: letter }))).status).toBe(200);
    const third = await POST(request({ text: letter }));
    expect(third.status).toBe(429);
    expect((await third.json()).error).toBe("rate_limited");
  });

  it("limits each address separately", async () => {
    const POST = await load({ RATE_LIMIT_PER_DAY: "1" });
    expect((await POST(request({ text: letter }, { "x-forwarded-for": "1.1.1.1" }))).status).toBe(200);
    expect((await POST(request({ text: letter }, { "x-forwarded-for": "2.2.2.2" }))).status).toBe(200);
  });

  it("requires a Turnstile token when a secret is set", async () => {
    const POST = await load({ TURNSTILE_SECRET_KEY: "secret" });
    const res = await POST(request({ text: letter }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("verification_failed");
  });

  it("passes when Turnstile succeeds", async () => {
    const POST = await load({ TURNSTILE_SECRET_KEY: "secret" });
    const f = vi.fn().mockImplementation(async (url: string) =>
      String(url).includes("turnstile") ? new Response(JSON.stringify({ success: true }), { status: 200 }) : groqResponse(modelAnswer),
    );
    vi.stubGlobal("fetch", f);
    const res = await POST(request({ text: letter, turnstileToken: "tok" }));
    expect(res.status).toBe(200);
  });

  it("returns 503 when no model key is configured", async () => {
    const POST = await load({ GROQ_API_KEY: undefined });
    const res = await POST(request({ text: letter }));
    expect(res.status).toBe(503);
  });

  it("returns 502 when the model is down", async () => {
    const POST = await load();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const res = await POST(request({ text: letter }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("model_unavailable");
  });

  it("returns 422 when the text is not an offer", async () => {
    const POST = await load();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(groqResponse({ ...modelAnswer, ctcAnnual: null, components: [], clauses: [] })));
    const res = await POST(request({ text: "x".repeat(50) + " hello how are you doing today, hope you are well and see you soon." }));
    expect(res.status).toBe(422);
  });

  it("never logs the letter and never echoes the key", async () => {
    const POST = await load();
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const res = await POST(request({ text: letter }));
    const body = await res.text();
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toContain("Basic salary");
    expect(body).not.toContain("test-key");
  });

  it("redacts personal details again on the server before calling the model", async () => {
    const POST = await load();
    const f = vi.fn().mockImplementation(async () => groqResponse(modelAnswer));
    vi.stubGlobal("fetch", f);
    await POST(request({ text: `${letter}\nContact: someone@example.com or 9876543210.` }));
    const sent = JSON.stringify((f.mock.calls[0]![1] as { body: string }).body);
    expect(sent).not.toContain("someone@example.com");
    expect(sent).not.toContain("9876543210");
  });
});
