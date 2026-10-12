import { describe, expect, it, vi } from "vitest";
import { ExtractionError, extractFromText, parseModelJson } from "./run";

const letter = `Your annual CTC is Rs. 6,00,000.
Basic salary: Rs. 20,000 per month.
You must serve a notice period of 90 days.`;

const good = {
  employerName: "Acme",
  jobTitle: "Engineer",
  location: "Bengaluru",
  stateForProfessionalTax: "KA",
  ctcAnnual: 600000,
  components: [{ label: "Basic", kind: "basic", amount: 20000, frequency: "monthly", quote: "Basic salary: Rs. 20,000 per month." }],
  pfBasis: "not_stated",
  clauses: [{ type: "notice_period", quote: "You must serve a notice period of 90 days.", days: 90 }],
  notes: [],
};

describe("parseModelJson", () => {
  it("parses plain JSON", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips code fences", () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("finds the object inside chatter", () => {
    expect(parseModelJson('Here you go: {"a":1} hope that helps')).toEqual({ a: 1 });
  });
  it("throws on garbage", () => {
    expect(() => parseModelJson("nope")).toThrow();
  });
});

describe("extractFromText", () => {
  it("returns a validated, sanitized extraction", async () => {
    const model = vi.fn().mockResolvedValue(JSON.stringify(good));
    const r = await extractFromText(letter, model);
    expect(r.extraction.ctcAnnual).toBe(600000);
    expect(r.extraction.clauses).toHaveLength(1);
    expect(model).toHaveBeenCalledTimes(1);
  });

  it("drops a hallucinated clause", async () => {
    const bad = { ...good, clauses: [...good.clauses, { type: "non_compete", quote: "You shall not work for any rival for three years." }] };
    const r = await extractFromText(letter, vi.fn().mockResolvedValue(JSON.stringify(bad)));
    expect(r.extraction.clauses.map((c) => c.type)).toEqual(["notice_period"]);
    expect(r.dropped.clauses).toBe(1);
  });

  it("retries once when the first answer is not valid", async () => {
    const model = vi.fn().mockResolvedValueOnce("sorry, no").mockResolvedValueOnce(JSON.stringify(good));
    const r = await extractFromText(letter, model);
    expect(r.extraction.ctcAnnual).toBe(600000);
    expect(model).toHaveBeenCalledTimes(2);
  });

  it("retries when the JSON fails the schema", async () => {
    const model = vi.fn().mockResolvedValueOnce(JSON.stringify({ ...good, components: [{ label: "x" }] })).mockResolvedValueOnce(JSON.stringify(good));
    await extractFromText(letter, model);
    expect(model).toHaveBeenCalledTimes(2);
  });

  it("gives up after two bad answers", async () => {
    const model = vi.fn().mockResolvedValue("still not json");
    await expect(extractFromText(letter, model)).rejects.toMatchObject({ code: "invalid_model_output" });
    expect(model).toHaveBeenCalledTimes(2);
  });

  it("reports a model outage", async () => {
    const model = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(extractFromText(letter, model)).rejects.toMatchObject({ code: "model_unavailable" });
  });

  it("says so when nothing usable was found", async () => {
    const empty = { ...good, ctcAnnual: null, components: [], clauses: [] };
    await expect(extractFromText("Hello there, thanks for the call yesterday.", vi.fn().mockResolvedValue(JSON.stringify(empty)))).rejects.toBeInstanceOf(ExtractionError);
    await expect(extractFromText("Hello there, thanks for the call yesterday.", vi.fn().mockResolvedValue(JSON.stringify(empty)))).rejects.toMatchObject({ code: "not_an_offer" });
  });

  it("wraps the letter as untrusted data in the prompt", async () => {
    const model = vi.fn().mockResolvedValue(JSON.stringify(good));
    await extractFromText(letter, model);
    const call = model.mock.calls[0]![0] as { system: string; user: string };
    expect(call.user).toContain("<letter>");
    expect(call.system.toLowerCase()).toContain("untrusted");
  });
});
