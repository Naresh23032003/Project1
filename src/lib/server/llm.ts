import type { ModelCall } from "../extract/run";

const TIMEOUT_MS = 40_000;
const MAX_TOKENS = 3000;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`model request failed with status ${res.status}`);
  return res.json();
}

export function groqCall(apiKey: string, model: string): ModelCall {
  return async ({ system, user }) => {
    const data = (await postJson(
      "https://api.groq.com/openai/v1/chat/completions",
      { Authorization: `Bearer ${apiKey}` },
      {
        model,
        temperature: 0,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
    )) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("empty model answer");
    return text;
  };
}

export function anthropicCall(apiKey: string, model: string): ModelCall {
  return async ({ system, user }) => {
    const data = (await postJson(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      { model, max_tokens: MAX_TOKENS, temperature: 0, system, messages: [{ role: "user", content: user }] },
    )) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) throw new Error("empty model answer");
    return text;
  };
}

export function getModelCall(env: NodeJS.ProcessEnv = process.env): ModelCall | null {
  const provider = (env.LLM_PROVIDER ?? "groq").toLowerCase();
  if (provider === "anthropic") {
    return env.ANTHROPIC_API_KEY ? anthropicCall(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL ?? "claude-haiku-5-5") : null;
  }
  return env.GROQ_API_KEY ? groqCall(env.GROQ_API_KEY, env.GROQ_MODEL ?? "llama-3.3-70b-versatile") : null;
}
