import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyse } from "@/lib/analyse";
import { ExtractionSchema } from "@/lib/extract/schema";
import { amountAppears, sanitizeExtraction } from "@/lib/extract/verify";
import { redact } from "@/lib/redact/redact";

const dir = path.join(import.meta.dirname, "fixtures");
const slugs = readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/, ""));

describe("golden letters (offline path)", () => {
  it("has at least 15 letters", () => {
    expect(slugs.length).toBeGreaterThanOrEqual(15);
  });

  for (const slug of slugs) {
    describe(slug, () => {
      const raw = readFileSync(path.join(dir, `${slug}.txt`), "utf8");
      const expected = JSON.parse(readFileSync(path.join(dir, `${slug}.expected.json`), "utf8"));
      const { redacted } = redact(raw);

      it("removes emails and phone numbers but keeps every pay figure", () => {
        expect(redacted).not.toMatch(/@[a-z]/i);
        expect(redacted).not.toMatch(/\+91[\s-]?\d|\b\d{5}[\s-]?\d{5}\b/);
        for (const c of expected.extraction.components) expect(amountAppears(c.amount, redacted)).toBe(true);
      });

      it("removes the candidate's name", () => {
        const name = raw.match(/^To,\n(.+)$/m)![1]!.replace(/^(MR|MS|Mr|Ms)\.\s*/, "").trim();
        for (const part of name.split(/\s+/)) expect(redacted.toLowerCase()).not.toContain(part.toLowerCase());
      });

      it("has quotes that appear in the redacted letter", () => {
        const parsed = ExtractionSchema.parse(expected.extraction);
        const { dropped } = sanitizeExtraction(parsed, redacted);
        expect(dropped).toEqual({ components: 0, clauses: 0, ctc: false });
      });

      it("produces the expected flags and a sane in-hand number", () => {
        const a = analyse(ExtractionSchema.parse(expected.extraction));
        expect(a.flags.map((f) => ({ id: f.id, level: f.level }))).toEqual(expected.flags);
        expect(a.salary.warnings).toEqual([]);
        // The only notice a golden letter may raise is that its stated PF ceiling is below the current one.
        for (const n of a.salary.notices) expect(n).toContain("statutory ceiling rose");
        expect(a.salary.regimes.new.monthlyInHand).toBeGreaterThan(0);
        expect(a.salary.regimes.new.monthlyInHand).toBeLessThan(a.salary.regimes.new.monthlyGross);
        for (const f of a.flags) expect(f.quote).toBeTruthy();
      });
    });
  }
});
