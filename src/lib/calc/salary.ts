import { DEFAULT_SPLIT, GRATUITY_PERCENT_OF_BASIC, MAX_80C, PF_CEILING_EFFECTIVE, PF_RATE, PF_WAGE_CEILING, STANDARD_DEDUCTION_NEW, STANDARD_DEDUCTION_OLD, type StateCode } from "../rules/india";
import { employeePf, hraExemption, professionalTax, wageCodeCheck, type PfBasis, type ProfessionalTaxResult } from "./payroll";
import { newRegimeTax, oldRegimeTax, type TaxBreakdown } from "./tax";

export type ComponentKind =
  | "basic"
  | "hra"
  | "special_allowance"
  | "other_allowance"
  | "dearness_allowance"
  | "employer_pf"
  | "gratuity"
  | "insurance"
  | "variable"
  | "retention_bonus"
  | "joining_bonus"
  | "relocation"
  | "esop"
  | "other";

export type Frequency = "monthly" | "annual" | "one_time" | "unspecified";
export type Regime = "new" | "old";

export interface SalaryComponent {
  label: string;
  kind: ComponentKind;
  amount: number;
  frequency: Frequency;
}

export interface SalaryInput {
  ctcAnnual: number | null;
  components: SalaryComponent[];
  pfBasis: PfBasis;
  state: StateCode;
  female?: boolean;
  /** The monthly PF wage ceiling the letter states, if any. Defaults to the current statutory ceiling. */
  pfCeilingMonthly?: number;
  split?: { basicShareOfCtc?: number };
  old?: {
    extra80C?: number;
    otherDeductions?: number;
    rentPaidAnnual?: number;
    metro?: boolean;
  };
}

export interface BucketItem {
  label: string;
  kind: ComponentKind;
  annual: number;
}

export interface Bucket {
  annual: number;
  shareOfCtc: number;
  items: BucketItem[];
}

export interface Step {
  id: string;
  label: string;
  explain: string;
  sign: "+" | "-" | "=";
  monthly: number;
  annual: number;
}

export interface RegimeResult {
  monthlyGross: number;
  monthlyEmployeePf: number;
  taxableIncome: number;
  tax: TaxBreakdown;
  annualTax: number;
  monthlyTax: number;
  monthlyPt: number;
  monthlyInHand: number;
  steps: Step[];
  variable: { annual: number; extraTax: number; afterTax: number } | null;
}

export interface SalaryResult {
  ctcAnnual: number;
  assumedSplit: boolean;
  assumptions: string[];
  /** Things worth knowing that are not problems with the letter. */
  notices: string[];
  warnings: string[];
  buckets: Record<"fixed" | "notMonthly" | "conditional" | "oneTime", Bucket>;
  ctcBridge: Step[];
  professionalTax: ProfessionalTaxResult;
  wageCode: ReturnType<typeof wageCodeCheck>;
  regimes: Record<Regime, RegimeResult>;
}

const FIXED: ComponentKind[] = ["basic", "hra", "special_allowance", "other_allowance", "dearness_allowance"];
const NOT_MONTHLY: ComponentKind[] = ["employer_pf", "gratuity", "insurance"];
const CONDITIONAL: ComponentKind[] = ["variable", "retention_bonus"];
const ONE_TIME: ComponentKind[] = ["joining_bonus", "relocation"];

function annualAmount(c: SalaryComponent): number {
  return c.frequency === "monthly" ? c.amount * 12 : c.amount;
}

type BucketName = keyof SalaryResult["buckets"];

function bucketOf(c: SalaryComponent): BucketName | null {
  if (FIXED.includes(c.kind)) return "fixed";
  if (NOT_MONTHLY.includes(c.kind)) return "notMonthly";
  if (CONDITIONAL.includes(c.kind)) return "conditional";
  if (ONE_TIME.includes(c.kind) || c.frequency === "one_time") return "oneTime";
  if (c.kind === "esop") return null;
  if (c.kind === "other") return c.frequency === "monthly" || c.frequency === "annual" ? "fixed" : "conditional";
  return null;
}

function assumedComponents(ctc: number, pfBasis: PfBasis, listedConditional: number, basicShare: number, pfCeiling: number): { components: SalaryComponent[]; assumptions: string[] } {
  const pool = ctc - listedConditional;
  const basic = Math.round(pool * basicShare);
  const hra = Math.round(basic * DEFAULT_SPLIT.hraShareOfBasic);
  const monthlyBasic = basic / 12;
  const pfWages = pfBasis === "ceiling" ? Math.min(monthlyBasic, pfCeiling) : monthlyBasic;
  const employerPf = Math.round(pfWages * PF_RATE * 12);
  const gratuity = Math.round(basic * GRATUITY_PERCENT_OF_BASIC);
  const special = pool - basic - hra - employerPf - gratuity;
  const rupees = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;
  return {
    components: [
      { label: "Basic (assumed)", kind: "basic", amount: basic, frequency: "annual" },
      { label: "HRA (assumed)", kind: "hra", amount: hra, frequency: "annual" },
      { label: "Special allowance (assumed)", kind: "special_allowance", amount: special, frequency: "annual" },
      { label: "Employer PF (assumed)", kind: "employer_pf", amount: employerPf, frequency: "annual" },
      { label: "Gratuity (assumed)", kind: "gratuity", amount: gratuity, frequency: "annual" },
    ],
    assumptions: [
      `Your letter gives only a total CTC, so we assumed basic is ${Math.round(basicShare * 100)}% of CTC (${rupees(basic)} a year).`,
      `We assumed HRA is half of basic (${rupees(hra)}) and gratuity is 4.81% of basic (${rupees(gratuity)}).`,
      `We assumed employer PF is ${pfBasis === "ceiling" ? `12% of basic up to the Rs ${pfCeiling.toLocaleString("en-IN")} wage ceiling` : "12% of full basic"} (${rupees(employerPf)}).`,
      "The rest is treated as special allowance. Real splits vary, so treat the result as an estimate.",
    ],
  };
}

export function computeSalary(input: SalaryInput): SalaryResult {
  const warnings: string[] = [];
  const assumptions: string[] = [];
  const notices: string[] = [];
  const pfCeiling = input.pfCeilingMonthly && input.pfCeilingMonthly > 0 ? input.pfCeilingMonthly : PF_WAGE_CEILING;

  const listedConditional = input.components.filter((c) => CONDITIONAL.includes(c.kind)).reduce((s, c) => s + annualAmount(c), 0);
  const hasFixed = input.components.some((c) => FIXED.includes(c.kind));

  let components = input.components;
  let assumedSplit = false;
  if (!hasFixed) {
    if (input.ctcAnnual == null || input.ctcAnnual <= 0) throw new Error("Need a CTC or at least one monthly pay component");
    const a = assumedComponents(input.ctcAnnual, input.pfBasis, listedConditional, input.split?.basicShareOfCtc ?? DEFAULT_SPLIT.basicShareOfCtc, pfCeiling);
    const keep = input.components.filter((c) => !FIXED.includes(c.kind) && !NOT_MONTHLY.includes(c.kind));
    components = [...a.components, ...keep];
    assumptions.push(...a.assumptions);
    assumedSplit = true;
  }

  const emptyBucket = (): Bucket => ({ annual: 0, shareOfCtc: 0, items: [] });
  const buckets: SalaryResult["buckets"] = { fixed: emptyBucket(), notMonthly: emptyBucket(), conditional: emptyBucket(), oneTime: emptyBucket() };
  for (const c of components) {
    const name = bucketOf(c);
    if (!name) continue;
    const annual = annualAmount(c);
    buckets[name].annual += annual;
    buckets[name].items.push({ label: c.label, kind: c.kind, annual });
  }

  const listedInCtc = buckets.fixed.annual + buckets.notMonthly.annual + buckets.conditional.annual;
  const ctc = input.ctcAnnual && input.ctcAnnual > 0 ? input.ctcAnnual : listedInCtc;
  if (input.ctcAnnual && input.ctcAnnual > 0 && !assumedSplit) {
    const close = (x: number) => Math.abs(input.ctcAnnual! - x) <= input.ctcAnnual! * 0.01;
    if (!close(listedInCtc) && !close(listedInCtc + buckets.oneTime.annual)) {
      warnings.push(
        `The components we found add up to Rs ${Math.round(listedInCtc).toLocaleString("en-IN")}, but the letter says CTC is Rs ${input.ctcAnnual.toLocaleString("en-IN")}. Some pay may be missing from the breakup.`,
      );
    }
  }
  for (const b of Object.values(buckets)) b.shareOfCtc = ctc > 0 ? b.annual / ctc : 0;

  const sumKind = (k: ComponentKind) => buckets.fixed.items.filter((i) => i.kind === k).reduce((s, i) => s + i.annual, 0);
  const basicAnnual = sumKind("basic");
  const daAnnual = sumKind("dearness_allowance");
  const hraAnnual = sumKind("hra");
  const gratuityAnnual = buckets.notMonthly.items.filter((i) => i.kind === "gratuity").reduce((s, i) => s + i.annual, 0);
  if (basicAnnual === 0) warnings.push("The letter doesn't state a basic salary, so PF is shown as zero. Ask HR for the breakup.");

  const wageCode = wageCodeCheck({ basic: basicAnnual, da: daAnnual, ctc, gratuity: gratuityAnnual });

  const grossAnnual = buckets.fixed.annual;
  const monthlyGross = grossAnnual / 12;
  const monthlyEmployeePf = employeePf(basicAnnual / 12, input.pfBasis, pfCeiling);
  if (input.pfBasis === "ceiling" && pfCeiling < PF_WAGE_CEILING && basicAnnual / 12 > pfCeiling) {
    const higher = employeePf(basicAnnual / 12, "ceiling", PF_WAGE_CEILING);
    const rs = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;
    notices.push(
      `Your letter limits PF to ${rs(pfCeiling)} a month. The statutory ceiling rose to ${rs(PF_WAGE_CEILING)} on ${PF_CEILING_EFFECTIVE}. If your employer applies the new ceiling, your PF would be ${rs(higher)} a month instead of ${rs(monthlyEmployeePf)}. Ask HR which applies to you.`,
    );
  }
  const pt = professionalTax(input.state, monthlyGross, { female: input.female });

  const rupee = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;

  const ctcBridge: Step[] = [
    { id: "ctc", sign: "+", label: "Total CTC", explain: "The yearly figure in your letter.", monthly: ctc / 12, annual: ctc },
  ];
  const addBridge = (id: string, label: string, explain: string, annual: number) => {
    if (annual > 0) ctcBridge.push({ id, sign: "-", label, explain, monthly: annual / 12, annual });
  };
  addBridge("employer-pf", "Employer PF", "Your employer's share of PF. It goes into your PF account, not your bank account.", sumNotMonthly("employer_pf"));
  addBridge("gratuity", "Gratuity", "A lump sum you get only after you complete the minimum years of service.", sumNotMonthly("gratuity"));
  addBridge("insurance", "Insurance premium", "Health or life cover your employer pays for. You don't receive this as cash.", sumNotMonthly("insurance"));
  addBridge("variable", "Variable or bonus pay", "Paid only if you or the company hit targets, so we leave it out of the monthly number.", buckets.conditional.annual);
  ctcBridge.push({ id: "fixed", sign: "=", label: "Fixed pay before deductions", explain: "Basic, HRA and allowances you get every month.", monthly: monthlyGross, annual: grossAnnual });

  function sumNotMonthly(k: ComponentKind) {
    return buckets.notMonthly.items.filter((i) => i.kind === k).reduce((s, i) => s + i.annual, 0);
  }

  const old = input.old ?? {};
  const hraEx = hraExemption({ basic: basicAnnual + daAnnual, hra: hraAnnual, rentPaid: old.rentPaidAnnual ?? 0, metro: old.metro ?? true });
  const employeePfAnnual = monthlyEmployeePf * 12;
  const ded80c = Math.min(MAX_80C, employeePfAnnual + (old.extra80C ?? 0));

  const taxableFor = (regime: Regime, extra = 0): number =>
    regime === "new"
      ? Math.max(0, grossAnnual + extra - STANDARD_DEDUCTION_NEW)
      : Math.max(0, grossAnnual + extra - STANDARD_DEDUCTION_OLD - ded80c - hraEx - pt.annual - (old.otherDeductions ?? 0));
  const taxFn = (regime: Regime) => (regime === "new" ? newRegimeTax : oldRegimeTax);

  const build = (regime: Regime): RegimeResult => {
    const taxable = taxableFor(regime);
    const tax = taxFn(regime)(taxable);
    const monthlyTax = tax.total / 12;
    const monthlyPt = pt.annual / 12;
    const monthlyInHand = monthlyGross - monthlyEmployeePf - monthlyTax - monthlyPt;

    let variable: RegimeResult["variable"] = null;
    if (buckets.conditional.annual > 0) {
      const withVar = taxFn(regime)(taxableFor(regime, buckets.conditional.annual)).total;
      const extraTax = withVar - tax.total;
      variable = { annual: buckets.conditional.annual, extraTax, afterTax: buckets.conditional.annual - extraTax };
    }

    const deductionNote =
      regime === "new"
        ? `Taxable income is ${rupee(taxable)} after the Rs 75,000 standard deduction.`
        : `Taxable income is ${rupee(taxable)} after the Rs 50,000 standard deduction, PF under 80C${hraEx ? ", HRA exemption" : ""} and professional tax.`;
    const steps: Step[] = [
      { id: "gross", sign: "+", label: "Fixed pay", explain: "Basic, HRA and allowances the letter promises each month.", monthly: monthlyGross, annual: grossAnnual },
      { id: "pf", sign: "-", label: "Your PF", explain: input.pfBasis === "ceiling" ? `12% of basic, counted up to Rs ${pfCeiling.toLocaleString("en-IN")} a month. It's your own savings.` : "12% of full basic. It's your own savings.", monthly: monthlyEmployeePf, annual: employeePfAnnual },
      { id: "tax", sign: "-", label: "Income tax", explain: `${deductionNote} Tax for the year is ${rupee(tax.total)}, taken in 12 parts.`, monthly: monthlyTax, annual: tax.total },
      { id: "pt", sign: "-", label: "Professional tax", explain: pt.note, monthly: monthlyPt, annual: pt.annual },
      { id: "inhand", sign: "=", label: "Monthly in-hand", explain: "What lands in your bank account in a typical month.", monthly: monthlyInHand, annual: monthlyInHand * 12 },
    ];
    return { monthlyGross, monthlyEmployeePf, taxableIncome: taxable, tax, annualTax: tax.total, monthlyTax, monthlyPt, monthlyInHand, steps, variable };
  };

  return {
    ctcAnnual: ctc,
    assumedSplit,
    assumptions,
    notices,
    warnings,
    buckets,
    ctcBridge,
    professionalTax: pt,
    wageCode,
    regimes: { new: build("new"), old: build("old") },
  };
}
