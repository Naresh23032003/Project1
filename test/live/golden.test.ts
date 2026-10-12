// Runs the real model against every golden letter. Needs GROQ_API_KEY (or ANTHROPIC_API_KEY with
// LLM_PROVIDER=anthropic). Not part of CI. Run with: npm run test:live
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { analyse } from "@/lib/analyse";
import { extractFromText } from "@/lib/extract/run";
import { redact } from "@/lib/redact/redact";
import { getModelCall } from "@/lib/server/llm";

const root = path.join(import.meta.dirname, "..", "..");
if (existsSync(path.join(root, ".env.local"))) process.loadEnvFile(path.join(root, ".env.local"));

const dir = path.join(import.meta.dirname, "..", "fixtures");
const slugs = readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/, ""));
const model = getModelCall();

interface Row {
  slug: string;
  ctcOk: boolean;
  amountsFound: number;
  amountsExpected: number;
  flagsExpected: string[];
  flagsGot: string[];
  extraFlags: string[];
  missingFlags: string[];
  error?: string;
}
const rows: Row[] = [];

const annual = (c: { amount: number; frequency: string }) => (c.frequency === "monthly" ? c.amount * 12 : c.amount);

describe.skipIf(!model)("golden letters (live model)", () => {
  for (const slug of slugs) {
    it(slug, async () => {
      const raw = readFileSync(path.join(dir, `${slug}.txt`), "utf8");
      const expected = JSON.parse(readFileSync(path.join(dir, `${slug}.expected.json`), "utf8"));
      const row: Row = { slug, ctcOk: false, amountsFound: 0, amountsExpected: expected.extraction.components.length, flagsExpected: expected.flags.map((f: { id: string }) => f.id), flagsGot: [], extraFlags: [], missingFlags: [] };
      rows.push(row);
      try {
        const { extraction } = await extractFromText(redact(raw).redacted, model!);
        row.ctcOk = (extraction.ctcAnnual ?? null) === expected.extraction.ctcAnnual;
        for (const want of expected.extraction.components) {
          if (extraction.components.some((c) => c.kind === want.kind && annual(c) === annual(want))) row.amountsFound++;
        }
        row.flagsGot = analyse(extraction).flags.map((f) => f.id);
        row.extraFlags = row.flagsGot.filter((id) => !row.flagsExpected.includes(id));
        row.missingFlags = row.flagsExpected.filter((id) => !row.flagsGot.includes(id));
      } catch (e) {
        row.error = e instanceof Error ? e.message : String(e);
      }
      expect(row.error).toBeUndefined();
      expect(row.extraFlags, "hallucinated flags").toEqual([]);
      expect(row.amountsFound, "key amounts").toBe(row.amountsExpected);
      expect(row.ctcOk, "CTC").toBe(true);
    });
  }

  afterAll(() => {
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 100);
    const summary = {
      provider: process.env.LLM_PROVIDER ?? "groq",
      model: process.env.GROQ_MODEL ?? process.env.ANTHROPIC_MODEL ?? "default",
      letters: rows.length,
      ctcCorrect: rows.filter((r) => r.ctcOk).length,
      amountsFound: rows.reduce((n, r) => n + r.amountsFound, 0),
      amountsExpected: rows.reduce((n, r) => n + r.amountsExpected, 0),
      hallucinatedFlags: rows.reduce((n, r) => n + r.extraFlags.length, 0),
      missedFlags: rows.reduce((n, r) => n + r.missingFlags.length, 0),
      rows,
    };
    writeFileSync(path.join(root, "test", "live", "last-run.json"), JSON.stringify(summary, null, 2) + "\n");
    console.log(`CTC ${summary.ctcCorrect}/${summary.letters}, amounts ${pct(summary.amountsFound, summary.amountsExpected)}%, hallucinated flags ${summary.hallucinatedFlags}, missed flags ${summary.missedFlags}`);
  });
});
