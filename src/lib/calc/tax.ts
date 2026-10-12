import {
  CESS_RATE,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  REBATE_NEW,
  REBATE_OLD,
  SURCHARGE_NEW,
  SURCHARGE_OLD,
  type Slab,
} from "../rules/india";

export interface TaxBreakdown {
  slabTax: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  total: number;
}

function slabTax(income: number, slabs: Slab[]): number {
  let tax = 0;
  let lower = 0;
  for (const s of slabs) {
    if (income <= lower) break;
    tax += (Math.min(income, s.upTo) - lower) * s.rate;
    lower = s.upTo;
  }
  return tax;
}

function surchargeRate(income: number, table: { above: number; rate: number }[]): number {
  let rate = 0;
  for (const t of table) if (income > t.above) rate = t.rate;
  return rate;
}

interface Regime {
  slabs: Slab[];
  rebate: { incomeLimit: number; maxRebate: number };
  marginalRelief: boolean;
  surcharge: { above: number; rate: number }[];
}

function afterRebate(income: number, r: Regime): number {
  const base = slabTax(income, r.slabs);
  if (income <= r.rebate.incomeLimit) return Math.max(0, base - r.rebate.maxRebate);
  if (r.marginalRelief) return Math.min(base, income - r.rebate.incomeLimit);
  return base;
}

// Tax plus surcharge before cess, with marginal relief at each surcharge threshold.
function taxWithSurcharge(income: number, r: Regime): { base: number; surcharge: number } {
  const base = afterRebate(income, r);
  let total = base + base * surchargeRate(income, r.surcharge);
  for (const t of r.surcharge) {
    if (income > t.above) {
      const at = taxWithSurcharge(t.above, r);
      total = Math.min(total, at.base + at.surcharge + (income - t.above));
    }
  }
  return { base, surcharge: total - base };
}

function compute(rawIncome: number, r: Regime): TaxBreakdown {
  const income = Math.max(0, Math.floor(rawIncome));
  const { base, surcharge } = taxWithSurcharge(income, r);
  const taxAfterRebate = Math.round(base);
  const sur = Math.round(surcharge);
  const cess = Math.round((taxAfterRebate + sur) * CESS_RATE);
  return {
    slabTax: Math.round(slabTax(income, r.slabs)),
    taxAfterRebate,
    surcharge: sur,
    cess,
    total: taxAfterRebate + sur + cess,
  };
}

export function newRegimeTax(taxableIncome: number): TaxBreakdown {
  return compute(taxableIncome, {
    slabs: NEW_REGIME_SLABS,
    rebate: REBATE_NEW,
    marginalRelief: true,
    surcharge: SURCHARGE_NEW,
  });
}

export function oldRegimeTax(taxableIncome: number): TaxBreakdown {
  return compute(taxableIncome, {
    slabs: OLD_REGIME_SLABS,
    rebate: REBATE_OLD,
    marginalRelief: false,
    surcharge: SURCHARGE_OLD,
  });
}
