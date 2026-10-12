import { describe, expect, it } from "vitest";
import { computeSalary, type SalaryInput } from "./salary";

const base: Pick<SalaryInput, "pfBasis" | "state"> = { pfBasis: "ceiling", state: "KA" };

describe("CTC-only letter", () => {
  // 6 lakh CTC. Assumed split: basic 40% = 240,000 (20,000 a month); HRA 50% of basic = 120,000;
  // employer PF 12% of 20,000 x 12 = 28,800 (below the 25,000 ceiling); gratuity 4.81% of basic = 11,544;
  // special allowance is the remainder = 600,000 - 240,000 - 120,000 - 28,800 - 11,544 = 199,656.
  // Fixed gross 559,656 a year = 46,638 a month. Employee PF 2,400 a month.
  // New regime taxable = 559,656 - 75,000 = 484,656 -> rebate wipes the tax.
  // Karnataka PT 2,500 a year = 208.33 a month. In-hand = 46,638 - 2,400 - 208.33 = 44,029.67.
  const r = computeSalary({ ...base, ctcAnnual: 600_000, components: [] });

  it("assumes a split and says so", () => {
    expect(r.assumedSplit).toBe(true);
    expect(r.assumptions.length).toBeGreaterThan(0);
  });

  it("builds the fixed pay from the assumed split", () => {
    expect(r.buckets.fixed.annual).toBe(559_656);
    expect(r.buckets.notMonthly.annual).toBe(40_344);
  });

  it("gives monthly in-hand under the new regime", () => {
    expect(r.regimes.new.annualTax).toBe(0);
    expect(r.regimes.new.monthlyInHand).toBeCloseTo(44_029.67, 1);
  });

  it("uses a ceiling the letter states and says when it is below the current one", () => {
    // Ceiling 15,000: employer PF 1,800 x 12 = 21,600; special = 600,000 - 240,000 - 120,000 - 21,600 - 11,544 = 206,856.
    const old = computeSalary({ ...base, ctcAnnual: 600_000, components: [], pfCeilingMonthly: 15_000 });
    expect(old.buckets.fixed.annual).toBe(566_856);
    expect(old.regimes.new.monthlyEmployeePf).toBe(1_800);
    expect(old.notices.some((n) => n.includes("25,000"))).toBe(true);
    expect(r.notices.some((n) => n.includes("17 September 2026"))).toBe(false);
  });
});

describe("explicit components, 12 lakh, Maharashtra, PF on full basic", () => {
  // basic 480,000; HRA 240,000; special 399,312; employer PF 57,600; gratuity 23,088. CTC 1,200,000.
  // Fixed gross = 1,119,312 -> 93,276 a month. Employee PF 4,800 a month.
  // New regime taxable = 1,044,312 -> under 12 lakh so no tax.
  // Maharashtra PT 2,500 a year. In-hand = 93,276 - 4,800 - 208.33 = 88,267.67.
  const r = computeSalary({
    pfBasis: "full_basic",
    state: "MH",
    ctcAnnual: 1_200_000,
    components: [
      { label: "Basic", kind: "basic", amount: 480_000, frequency: "annual" },
      { label: "HRA", kind: "hra", amount: 240_000, frequency: "annual" },
      { label: "Special allowance", kind: "special_allowance", amount: 399_312, frequency: "annual" },
      { label: "Employer PF", kind: "employer_pf", amount: 57_600, frequency: "annual" },
      { label: "Gratuity", kind: "gratuity", amount: 23_088, frequency: "annual" },
    ],
  });

  it("does not assume a split", () => {
    expect(r.assumedSplit).toBe(false);
  });

  it("computes in-hand", () => {
    expect(r.regimes.new.monthlyGross).toBe(93_276);
    expect(r.regimes.new.monthlyEmployeePf).toBe(4_800);
    expect(r.regimes.new.monthlyInHand).toBeCloseTo(88_267.67, 1);
  });
});

describe("20 lakh with tax, Karnataka, PF on full basic", () => {
  // basic 800,000; HRA 400,000; employer PF 96,000; gratuity 38,480; special 665,520.
  // Fixed gross = 1,865,520 -> 155,460 a month. Employee PF 8,000 a month.
  // New: taxable 1,790,520. Tax = 20,000 + 40,000 + 60,000 + 20% of 190,520 (38,104) = 158,104; cess 6,324; total 164,428 -> 13,702.33 a month.
  // PT 2,500 a year = 208.33. In-hand = 155,460 - 8,000 - 13,702.33 - 208.33 = 133,549.33.
  // Old: taxable = 1,865,520 - 50,000 - 96,000 (80C from PF) - 2,500 PT = 1,717,020.
  // Tax = 112,500 + 30% of 717,020 (215,106) = 327,606; cess 13,104; total 340,710 -> 28,392.5 a month.
  // In-hand = 155,460 - 8,000 - 28,392.5 - 208.33 = 118,859.17.
  const input: SalaryInput = {
    pfBasis: "full_basic",
    state: "KA",
    ctcAnnual: 2_000_000,
    components: [
      { label: "Basic", kind: "basic", amount: 800_000, frequency: "annual" },
      { label: "HRA", kind: "hra", amount: 400_000, frequency: "annual" },
      { label: "Special allowance", kind: "special_allowance", amount: 665_520, frequency: "annual" },
      { label: "Employer PF", kind: "employer_pf", amount: 96_000, frequency: "annual" },
      { label: "Gratuity", kind: "gratuity", amount: 38_480, frequency: "annual" },
    ],
  };
  const r = computeSalary(input);

  it("new regime", () => {
    expect(r.regimes.new.annualTax).toBe(164_428);
    expect(r.regimes.new.monthlyInHand).toBeCloseTo(133_549.33, 1);
  });

  it("old regime", () => {
    expect(r.regimes.old.annualTax).toBe(340_710);
    expect(r.regimes.old.monthlyInHand).toBeCloseTo(118_859.17, 1);
  });

  it("steps end at the in-hand number", () => {
    const steps = r.regimes.new.steps;
    expect(steps[0]?.sign).toBe("+");
    expect(steps[steps.length - 1]?.monthly).toBeCloseTo(133_549.33, 1);
  });

  it("old regime HRA exemption reduces tax when rent is given", () => {
    const withRent = computeSalary({
      ...input,
      old: { rentPaidAnnual: 360_000, metro: true },
    });
    // HRA exemption = min(400,000, 360,000 - 80,000 = 280,000, 50% of 800,000 = 400,000) = 280,000
    // Old taxable = 1,717,020 - 280,000 = 1,437,020
    // Tax = 112,500 + 30% of 437,020 (131,106) = 243,606; cess 9,744; total 253,350
    expect(withRent.regimes.old.annualTax).toBe(253_350);
  });
});

describe("variable pay and one-time money", () => {
  // Same letter as the 20 lakh example but 100,000 of the CTC is variable.
  // Special allowance 565,520. Fixed gross 1,765,520, taxable 1,690,520.
  // Tax = 120,000 + 20% of 90,520 (18,104) = 138,104; cess 5,524; total 143,628.
  // With the variable paid in full, taxable 1,790,520 -> total 164,428, so extra tax 20,800.
  const r = computeSalary({
    pfBasis: "full_basic",
    state: "KA",
    ctcAnnual: 2_000_000,
    components: [
      { label: "Basic", kind: "basic", amount: 800_000, frequency: "annual" },
      { label: "HRA", kind: "hra", amount: 400_000, frequency: "annual" },
      { label: "Special allowance", kind: "special_allowance", amount: 565_520, frequency: "annual" },
      { label: "Employer PF", kind: "employer_pf", amount: 96_000, frequency: "annual" },
      { label: "Gratuity", kind: "gratuity", amount: 38_480, frequency: "annual" },
      { label: "Variable", kind: "variable", amount: 100_000, frequency: "annual" },
      { label: "Joining bonus", kind: "joining_bonus", amount: 50_000, frequency: "one_time" },
    ],
  });

  it("keeps variable out of the in-hand number", () => {
    expect(r.regimes.new.annualTax).toBe(143_628);
  });

  it("works out the tax cost of the variable", () => {
    expect(r.regimes.new.variable?.annual).toBe(100_000);
    expect(r.regimes.new.variable?.extraTax).toBe(20_800);
    expect(r.regimes.new.variable?.afterTax).toBe(79_200);
  });

  it("splits CTC shares into buckets", () => {
    expect(r.buckets.fixed.annual).toBe(1_765_520);
    expect(r.buckets.notMonthly.annual).toBe(134_480);
    expect(r.buckets.conditional.annual).toBe(100_000);
    expect(r.buckets.oneTime.annual).toBe(50_000);
    expect(r.buckets.fixed.shareOfCtc).toBeCloseTo(0.8828, 3);
  });
});

describe("warnings", () => {
  it("warns when listed components do not match the stated CTC", () => {
    const r = computeSalary({
      ...base,
      ctcAnnual: 1_000_000,
      components: [{ label: "Basic", kind: "basic", amount: 300_000, frequency: "annual" }],
    });
    expect(r.warnings.some((w) => w.includes("add up"))).toBe(true);
  });

  it("adds a wage code note when basic is under half of remuneration", () => {
    const r = computeSalary({
      ...base,
      ctcAnnual: 1_000_000,
      components: [
        { label: "Basic", kind: "basic", amount: 300_000, frequency: "annual" },
        { label: "Special allowance", kind: "special_allowance", amount: 660_000, frequency: "annual" },
        { label: "Gratuity", kind: "gratuity", amount: 40_000, frequency: "annual" },
      ],
    });
    expect(r.wageCode.belowHalf).toBe(true);
  });

  it("treats monthly amounts as twelve a year", () => {
    const r = computeSalary({
      ...base,
      ctcAnnual: null,
      components: [{ label: "Basic", kind: "basic", amount: 20_000, frequency: "monthly" }],
    });
    expect(r.buckets.fixed.annual).toBe(240_000);
  });
});

describe("editable split", () => {
  // 6 lakh CTC with basic at 50%: basic 300,000 (exactly 25,000 a month); HRA 150,000; employer PF 12% of 25,000 x 12 = 36,000;
  // gratuity 4.81% of 300,000 = 14,430; special = 600,000 - 300,000 - 150,000 - 36,000 - 14,430 = 99,570.
  // Fixed gross = 300,000 + 150,000 + 99,570 = 549,570.
  it("uses the basic share the user sets", () => {
    const r = computeSalary({ ...base, ctcAnnual: 600_000, components: [], split: { basicShareOfCtc: 0.5 } });
    expect(r.buckets.fixed.annual).toBe(549_570);
  });
});
