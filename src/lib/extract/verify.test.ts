import { describe, expect, it } from "vitest";
import { normalizeForMatch, quoteAppears, sanitizeExtraction } from "./verify";
import type { Extraction } from "./schema";

const letter = `Dear [NAME],
Your annual CTC is Rs. 6,00,000.
Basic salary: Rs. 20,000 per month.
You must serve a notice period of 90 days.
If you leave within 24 months, you shall repay the "training cost" of Rs. 1,00,000.`;

describe("normalizeForMatch", () => {
  it("ignores case, spacing, quotes and punctuation", () => {
    expect(normalizeForMatch("You  must serve\na NOTICE period, of 90 days!")).toBe(
      normalizeForMatch("you must serve a notice period of 90 days"),
    );
  });
  it("treats curly and straight quotes alike", () => {
    expect(normalizeForMatch("the “training cost”")).toBe(normalizeForMatch('the "training cost"'));
  });
});

describe("quoteAppears", () => {
  it("accepts an exact sentence", () => {
    expect(quoteAppears("You must serve a notice period of 90 days.", letter)).toBe(true);
  });
  it("accepts a sentence with different line breaks", () => {
    expect(quoteAppears("If you leave within 24 months,\nyou shall repay the training cost of Rs. 1,00,000", letter)).toBe(true);
  });
  it("rejects invented text", () => {
    expect(quoteAppears("You may not work for any competitor for two years.", letter)).toBe(false);
  });
  it("rejects very short quotes", () => {
    expect(quoteAppears("90 days", letter)).toBe(false);
  });
});

const base: Extraction = {
  employerName: "Acme",
  jobTitle: null,
  location: "Bengaluru",
  stateForProfessionalTax: "KA",
  ctcAnnual: 600000,
  components: [
    { label: "Basic", kind: "basic", amount: 20000, frequency: "monthly", quote: "Basic salary: Rs. 20,000 per month." },
    { label: "Invented", kind: "hra", amount: 77777, frequency: "monthly", quote: "HRA is Rs. 77,777 per month." },
  ],
  pfBasis: "not_stated",
  clauses: [
    { type: "notice_period", quote: "You must serve a notice period of 90 days.", days: 90 },
    { type: "non_compete", quote: "You shall not work for any competitor for two years after leaving." },
  ],
  notes: [],
};

describe("sanitizeExtraction", () => {
  const { extraction, dropped } = sanitizeExtraction(base, letter);

  it("drops clauses whose quote is not in the letter", () => {
    expect(extraction.clauses.map((c) => c.type)).toEqual(["notice_period"]);
  });
  it("drops components that match neither by quote nor by amount", () => {
    expect(extraction.components.map((c) => c.label)).toEqual(["Basic"]);
  });
  it("counts what it dropped", () => {
    expect(dropped.clauses).toBe(1);
    expect(dropped.components).toBe(1);
  });
  it("keeps a component whose quote is loose but whose amount is in the letter", () => {
    const loose: Extraction = {
      ...base,
      components: [{ label: "Basic", kind: "basic", amount: 20000, frequency: "monthly", quote: "Basic 20000" }],
      clauses: [],
    };
    expect(sanitizeExtraction(loose, letter).extraction.components).toHaveLength(1);
  });
  it("nulls a CTC that does not appear in the letter", () => {
    const wrong: Extraction = { ...base, ctcAnnual: 900000, components: [], clauses: [] };
    expect(sanitizeExtraction(wrong, letter).extraction.ctcAnnual).toBeNull();
  });
  it("keeps a PF ceiling that the letter states", () => {
    const l = "PF is limited to the statutory wage ceiling of Rs. 15,000 per month.";
    const e: Extraction = { ...base, pfBasis: "ceiling", pfCeilingAmount: 15000, components: [], clauses: [] };
    expect(sanitizeExtraction(e, l).extraction.pfCeilingAmount).toBe(15000);
  });
  it("drops a PF ceiling that the letter does not state", () => {
    const e: Extraction = { ...base, pfBasis: "ceiling", pfCeilingAmount: 15000, components: [], clauses: [] };
    expect(sanitizeExtraction(e, letter).extraction.pfCeilingAmount).toBeNull();
  });
  it("accepts a CTC written in lakh", () => {
    const lpa: Extraction = { ...base, ctcAnnual: 850000, components: [], clauses: [] };
    expect(sanitizeExtraction(lpa, "Your CTC is 8.5 LPA").extraction.ctcAnnual).toBe(850000);
  });
});
