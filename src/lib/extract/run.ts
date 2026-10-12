import { RETRY_NOTE, SYSTEM_PROMPT, userPrompt } from "./prompt";
import { ExtractionSchema, type Extraction } from "./schema";
import { sanitizeExtraction, type Dropped } from "./verify";

export type ErrorCode = "invalid_model_output" | "model_unavailable" | "not_an_offer";

export class ExtractionError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface ModelRequest {
  system: string;
  user: string;
}

export type ModelCall = (req: ModelRequest) => Promise<string>;

export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("no JSON object in the answer");
  }
}

export async function extractFromText(text: string, callModel: ModelCall): Promise<{ extraction: Extraction; dropped: Dropped }> {
  let user = userPrompt(text);
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      raw = await callModel({ system: SYSTEM_PROMPT, user });
    } catch {
      throw new ExtractionError("model_unavailable", "The model could not be reached.");
    }
    const parsed = (() => {
      try {
        return ExtractionSchema.safeParse(parseModelJson(raw));
      } catch {
        return null;
      }
    })();
    if (parsed?.success) {
      const result = sanitizeExtraction(parsed.data, text);
      const e = result.extraction;
      if (e.ctcAnnual == null && e.components.length === 0 && e.clauses.length === 0) {
        throw new ExtractionError("not_an_offer", "No pay or clauses were found in this text.");
      }
      return result;
    }
    user = `${userPrompt(text)}\n\n${RETRY_NOTE}`;
  }
  throw new ExtractionError("invalid_model_output", "The model's answer could not be read.");
}
