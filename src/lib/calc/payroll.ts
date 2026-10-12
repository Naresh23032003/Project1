import {
  PF_RATE,
  PF_WAGE_CEILING,
  PT_GUJARAT,
  PT_KARNATAKA,
  PT_KERALA,
  PT_MAHARASHTRA,
  PT_TAMIL_NADU,
  PT_TELANGANA,
  PT_WEST_BENGAL,
  WAGE_SHARE_MINIMUM,
  type StateCode,
} from "../rules/india";

export type PfBasis = "ceiling" | "full_basic";

export function employeePf(monthlyBasic: number, basis: PfBasis, ceiling: number = PF_WAGE_CEILING): number {
  const wages = basis === "ceiling" ? Math.min(monthlyBasic, ceiling) : monthlyBasic;
  return Math.round(wages * PF_RATE);
}

export interface ProfessionalTaxResult {
  annual: number;
  /** Calendar months, January first. */
  monthly: number[];
  confidence: "good" | "medium" | "low" | "unknown";
  note: string;
}

const FEB = 1;
const MAR = 2;
const SEP = 8;

function flat(amount: number): number[] {
  return Array<number>(12).fill(amount);
}

function sum(a: number[]): number {
  return a.reduce((x, y) => x + y, 0);
}

function halfYearly(amount: number): number[] {
  const m = flat(0);
  m[SEP] = amount;
  m[MAR] = amount;
  return m;
}

export function professionalTax(
  state: StateCode,
  monthlyGross: number,
  opts: { female?: boolean } = {},
): ProfessionalTaxResult {
  const make = (monthly: number[], confidence: ProfessionalTaxResult["confidence"], note: string) => ({
    annual: sum(monthly),
    monthly,
    confidence,
    note,
  });

  switch (state) {
    case "KA": {
      if (monthlyGross < PT_KARNATAKA.threshold) return make(flat(0), "good", "No professional tax below 25,000 a month.");
      const m = flat(PT_KARNATAKA.regular);
      m[FEB] = PT_KARNATAKA.february;
      return make(m, "good", "200 a month, 300 in February.");
    }
    case "MH": {
      if (opts.female) {
        if (monthlyGross <= PT_MAHARASHTRA.femaleThreshold) return make(flat(0), "good", "No professional tax for women up to 25,000 a month.");
        const m = flat(PT_MAHARASHTRA.femaleRate.regular);
        m[FEB] = PT_MAHARASHTRA.femaleRate.february;
        return make(m, "good", "200 a month, 300 in February.");
      }
      const band = PT_MAHARASHTRA.maleBands.find((b) => monthlyGross > b.above);
      if (!band) return make(flat(0), "good", "No professional tax up to 7,500 a month.");
      const m = flat(band.regular);
      m[FEB] = band.february;
      return make(m, "good", band.regular === 175 ? "175 a month." : "200 a month, 300 in February.");
    }
    case "TG": {
      const band = PT_TELANGANA.find((b) => monthlyGross > b.above);
      return make(flat(band?.monthly ?? 0), "good", band ? `${band.monthly} a month.` : "No professional tax up to 15,000 a month.");
    }
    case "WB": {
      const band = PT_WEST_BENGAL.find((b) => monthlyGross > b.above);
      return make(flat(band?.monthly ?? 0), "good", band ? `${band.monthly} a month.` : "No professional tax up to 10,000 a month.");
    }
    case "GJ": {
      const band = PT_GUJARAT.find((b) => monthlyGross > b.above);
      return make(flat(band?.monthly ?? 0), "good", band ? "200 a month." : "No professional tax up to 12,000 a month.");
    }
    case "TN": {
      const half = monthlyGross * 6;
      const band = PT_TAMIL_NADU.find((b) => half > b.above);
      return make(halfYearly(band?.halfYear ?? 0), "medium", "Charged twice a year, in September and March. These are Greater Chennai rates; other local bodies differ a little.");
    }
    case "KL": {
      const half = monthlyGross * 6;
      const band = PT_KERALA.find((b) => half >= b.atLeast);
      return make(halfYearly(band?.halfYear ?? 0), "medium", "Charged twice a year on your half-yearly pay, with a cap of Rs 2,500 a year.");
    }
    case "DL":
    case "HR":
      return make(flat(0), "good", "This state has no professional tax.");
    default:
      return make(flat(0), "unknown", "We don't have this state's rates, so professional tax is left out.");
  }
}

export interface WageCodeInput {
  basic: number;
  da: number;
  ctc: number;
  gratuity: number;
}

export function wageCodeCheck(i: WageCodeInput) {
  const remuneration = i.ctc - i.gratuity;
  const wages = i.basic + i.da;
  const wageShare = remuneration > 0 ? wages / remuneration : 0;
  return {
    remuneration,
    wages,
    wageShare,
    belowHalf: wageShare < WAGE_SHARE_MINIMUM,
    effectiveWages: Math.max(wages, remuneration * WAGE_SHARE_MINIMUM),
  };
}

export function hraExemption(i: { basic: number; hra: number; rentPaid: number; metro: boolean }): number {
  if (i.rentPaid <= 0) return 0;
  return Math.max(0, Math.min(i.hra, i.rentPaid - 0.1 * i.basic, (i.metro ? 0.5 : 0.4) * i.basic));
}
