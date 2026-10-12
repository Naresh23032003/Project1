import { describe, expect, it } from "vitest";
import { analyse } from "./analyse";
import type { Extraction } from "./extract/schema";

const base: Extraction = {
  employerName: null,
  jobTitle: null,
  location: null,
  stateForProfessionalTax: null,
  ctcAnnual: 600000,
  components: [],
  pfBasis: "not_stated",
  clauses: [],
  notes: [],
};

describe("analyse", () => {
  it("defaults the state to OTHER and PF to the ceiling when the letter is silent", () => {
    const a = analyse(base);
    expect(a.input.state).toBe("OTHER");
    expect(a.input.pfBasis).toBe("ceiling");
    expect(a.pfAssumed).toBe(true);
  });

  it("respects an explicit PF basis", () => {
    const a = analyse({ ...base, pfBasis: "full_basic" });
    expect(a.input.pfBasis).toBe("full_basic");
    expect(a.pfAssumed).toBe(false);
  });

  it("lets the caller override PF basis and state", () => {
    const a = analyse(base, { pfBasis: "full_basic", state: "MH" });
    expect(a.input.pfBasis).toBe("full_basic");
    expect(a.input.state).toBe("MH");
  });

  it("passes a PF ceiling stated in the letter to the calculator", () => {
    const a = analyse({ ...base, pfBasis: "ceiling", pfCeilingAmount: 15000 });
    expect(a.input.pfCeilingMonthly).toBe(15000);
  });

  it("feeds variable pay and the assumed split into the flags", () => {
    const a = analyse({
      ...base,
      ctcAnnual: 1000000,
      components: [{ label: "Variable", kind: "variable", amount: 400000, frequency: "annual", quote: "Variable pay Rs. 4,00,000 per annum" }],
    });
    expect(a.flags.some((f) => f.id === "variable_share" && f.level === "red")).toBe(true);
    expect(a.questions.some((q) => q.toLowerCase().includes("breakup"))).toBe(true);
  });
});
