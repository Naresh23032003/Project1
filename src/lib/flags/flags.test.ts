import { describe, expect, it } from "vitest";
import { buildFlags, buildQuestions } from "./flags";
import type { Extraction } from "../extract/schema";

const blank: Extraction = {
  employerName: null,
  jobTitle: null,
  location: null,
  stateForProfessionalTax: null,
  ctcAnnual: 1_000_000,
  components: [],
  pfBasis: "not_stated",
  clauses: [],
  notes: [],
};

const ctx = { ctcAnnual: 1_000_000, variableAnnual: 0, assumedSplit: false, wageShareBelowHalf: false };

describe("buildFlags", () => {
  it("raises a red flag for a service bond and quotes it", () => {
    const flags = buildFlags(
      { ...blank, clauses: [{ type: "service_bond", quote: "You agree to serve for 24 months or pay Rs 2,00,000.", months: 24, amount: 200_000 }] },
      ctx,
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ level: "red", id: "service_bond", quote: "You agree to serve for 24 months or pay Rs 2,00,000." });
    expect(flags[0]!.why).toContain("2,00,000");
    expect(flags[0]!.why).toContain("24 months");
  });

  it("treats a 60 day notice period as fine", () => {
    expect(buildFlags({ ...blank, clauses: [{ type: "notice_period", quote: "Notice period is 60 days.", days: 60 }] }, ctx)).toHaveLength(0);
  });

  it("yellow flags a notice over 60 days and red flags one over 90", () => {
    const f = (days: number) => buildFlags({ ...blank, clauses: [{ type: "notice_period", quote: "Notice period is long here.", days }] }, ctx)[0];
    expect(f(61)?.level).toBe("yellow");
    expect(f(90)?.level).toBe("yellow");
    expect(f(91)?.level).toBe("red");
  });

  it("reads notice in months", () => {
    const f = buildFlags({ ...blank, clauses: [{ type: "notice_period", quote: "Notice period is 3 months here.", months: 3 }] }, ctx);
    expect(f[0]?.level).toBe("yellow");
  });

  it("flags variable pay by share of CTC", () => {
    const f = (variableAnnual: number) => buildFlags(blank, { ...ctx, variableAnnual })[0];
    expect(f(150_000)).toBeUndefined(); // exactly 15%
    expect(f(150_001)?.level).toBe("yellow");
    expect(f(300_001)?.level).toBe("red");
  });

  it("red flags non-compete, clawback and unpaid training", () => {
    const flags = buildFlags(
      {
        ...blank,
        clauses: [
          { type: "non_compete", quote: "You will not join a competitor for 12 months." },
          { type: "joining_bonus_clawback", quote: "Joining bonus is repayable if you leave in 12 months." },
          { type: "unpaid_training", quote: "The first month of training is unpaid." },
        ],
      },
      ctx,
    );
    expect(flags.map((x) => x.level)).toEqual(["red", "red", "red"]);
  });

  it("yellow flags vague probation but not a clear 3 month one", () => {
    const vague = buildFlags({ ...blank, clauses: [{ type: "probation", quote: "You will be on probation initially." }] }, ctx);
    expect(vague[0]?.level).toBe("yellow");
    const clear = buildFlags({ ...blank, clauses: [{ type: "probation", quote: "Probation lasts three months.", months: 3 }] }, ctx);
    expect(clear).toHaveLength(0);
  });

  it("flags a long probation", () => {
    expect(buildFlags({ ...blank, clauses: [{ type: "probation", quote: "Probation is nine months long.", months: 9 }] }, ctx)[0]?.level).toBe("yellow");
  });

  it("keeps only the first flag of each type", () => {
    const flags = buildFlags(
      {
        ...blank,
        clauses: [
          { type: "non_compete", quote: "You will not join a competitor for 12 months." },
          { type: "non_compete", quote: "No competing work for twelve months after exit." },
        ],
      },
      ctx,
    );
    expect(flags).toHaveLength(1);
  });

  it("puts red flags before yellow", () => {
    const flags = buildFlags(
      {
        ...blank,
        clauses: [
          { type: "relocation", quote: "You may be relocated to any city we choose." },
          { type: "non_compete", quote: "You will not join a competitor for 12 months." },
        ],
      },
      ctx,
    );
    expect(flags.map((f) => f.level)).toEqual(["red", "yellow"]);
  });

  it("ignores clause types that are only informational", () => {
    expect(buildFlags({ ...blank, clauses: [{ type: "background_check", quote: "Offer is subject to background verification." }] }, ctx)).toHaveLength(0);
  });
});

describe("buildQuestions", () => {
  it("asks for the breakup when the split was assumed", () => {
    const q = buildQuestions(blank, [], { ...ctx, assumedSplit: true });
    expect(q.some((x) => x.toLowerCase().includes("breakup"))).toBe(true);
  });
  it("asks about the PF basis when the letter is silent", () => {
    expect(buildQuestions(blank, [], ctx).some((x) => x.includes("PF"))).toBe(true);
  });
  it("includes each flag's question", () => {
    const flags = buildFlags({ ...blank, clauses: [{ type: "non_compete", quote: "You will not join a competitor for 12 months." }] }, ctx);
    const q = buildQuestions(blank, flags, ctx);
    expect(q).toContain(flags[0]!.ask);
  });
  it("asks about variable payout history when variable pay exists", () => {
    expect(buildQuestions(blank, [], { ...ctx, variableAnnual: 100_000 }).some((x) => x.toLowerCase().includes("variable"))).toBe(true);
  });
});
