import { describe, expect, it } from "vitest";
import { analyse } from "./analyse";
import { SAMPLE_EXTRACTION, SAMPLE_LETTER } from "./sample";
import { sanitizeExtraction } from "./extract/verify";

describe("sample letter", () => {
  it("has quotes that appear in the sample letter", () => {
    expect(sanitizeExtraction(SAMPLE_EXTRACTION, SAMPLE_LETTER).dropped).toEqual({ components: 0, clauses: 0, ctc: false });
  });

  it("decodes to the numbers worked out by hand", () => {
    // Fixed pay = 336,000 + 168,000 + 199,838 = 703,838 -> 58,653.17 a month.
    // Basic is 28,000 a month, above the 25,000 ceiling, so employee PF = 12% of 25,000 = 3,000 a month.
    // New regime taxable = 703,838 - 75,000 = 628,838 -> rebate wipes the tax.
    // Karnataka PT 2,500 a year = 208.33 a month. In-hand = 58,653.17 - 3,000 - 208.33 = 55,444.83.
    const a = analyse(SAMPLE_EXTRACTION);
    expect(a.salary.warnings).toEqual([]);
    expect(a.salary.notices).toEqual([]);
    expect(a.salary.regimes.new.monthlyInHand).toBeCloseTo(55_444.83, 1);
  });

  it("works out the old regime by hand too", () => {
    // Old taxable = 703,838 - 50,000 - 36,000 (employee PF under 80C) - 2,500 (professional tax) = 615,338.
    // Tax = 12,500 + 20% of 115,338 (23,067.6) = 35,567.6 -> 35,568; cess 1,423; total 36,991 -> 3,082.58 a month.
    // In-hand = 58,653.17 - 3,000 - 3,082.58 - 208.33 = 52,362.25.
    const a = analyse(SAMPLE_EXTRACTION);
    expect(a.salary.regimes.old.annualTax).toBe(36_991);
    expect(a.salary.regimes.old.monthlyInHand).toBeCloseTo(52_362.25, 1);
  });

  it("shows two red flags and one worth checking, red first", () => {
    const flags = analyse(SAMPLE_EXTRACTION).flags;
    expect(flags.map((f) => `${f.level}:${f.id}`)).toEqual(["red:joining_bonus_clawback", "red:service_bond", "yellow:notice_period"]);
  });
});
