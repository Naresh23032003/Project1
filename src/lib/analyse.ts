import { buildFlags, buildQuestions, type Flag, type FlagContext } from "./flags/flags";
import { computeSalary, type SalaryInput, type SalaryResult } from "./calc/salary";
import type { PfBasis } from "./calc/payroll";
import type { Extraction } from "./extract/schema";
import type { StateCode } from "./rules/india";

export interface Overrides {
  pfBasis?: PfBasis;
  state?: StateCode;
  female?: boolean;
  old?: SalaryInput["old"];
  split?: SalaryInput["split"];
}

export interface Analysis {
  input: SalaryInput;
  pfAssumed: boolean;
  stateAssumed: boolean;
  salary: SalaryResult;
  flags: Flag[];
  questions: string[];
}

export function analyse(extraction: Extraction, overrides: Overrides = {}): Analysis {
  const pfAssumed = overrides.pfBasis == null && extraction.pfBasis === "not_stated";
  const pfBasis: PfBasis = overrides.pfBasis ?? (extraction.pfBasis === "full_basic" ? "full_basic" : "ceiling");
  const state: StateCode = overrides.state ?? extraction.stateForProfessionalTax ?? "OTHER";
  const stateAssumed = overrides.state == null && extraction.stateForProfessionalTax == null;

  const input: SalaryInput = {
    ctcAnnual: extraction.ctcAnnual,
    components: extraction.components.map(({ label, kind, amount, frequency }) => ({ label, kind, amount, frequency })),
    pfBasis,
    state,
    pfCeilingMonthly: extraction.pfCeilingAmount ?? undefined,
    female: overrides.female,
    old: overrides.old,
    split: overrides.split,
  };
  const salary = computeSalary(input);

  const ctx: FlagContext = {
    ctcAnnual: salary.ctcAnnual,
    variableAnnual: salary.buckets.conditional.annual,
    assumedSplit: salary.assumedSplit,
    wageShareBelowHalf: salary.wageCode.belowHalf,
  };
  const flags = buildFlags(extraction, ctx);
  const questions = buildQuestions(extraction, flags, ctx);
  return { input, pfAssumed, stateAssumed, salary, flags, questions };
}
