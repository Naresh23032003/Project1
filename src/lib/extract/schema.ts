import { z } from "zod";

// Our CSP has no unsafe-eval, so skip zod's code-generation fast path (it probes with new Function).
z.config({ jitless: true });

export const COMPONENT_KINDS = [
  "basic",
  "hra",
  "special_allowance",
  "other_allowance",
  "dearness_allowance",
  "employer_pf",
  "gratuity",
  "insurance",
  "variable",
  "retention_bonus",
  "joining_bonus",
  "relocation",
  "esop",
  "other",
] as const;

export const CLAUSE_TYPES = [
  "service_bond",
  "training_cost_recovery",
  "notice_period",
  "joining_bonus_clawback",
  "non_compete",
  "non_solicit",
  "probation",
  "unpaid_training",
  "relocation",
  "location_change",
  "shift_change",
  "variable_pay_discretion",
  "ctc_includes_one_time",
  "background_check",
  "moonlighting",
  "ip_assignment",
  "other",
] as const;

export const STATE_CODES = ["KA", "MH", "TN", "TG", "WB", "GJ", "KL", "DL", "HR", "OTHER"] as const;

const optionalNumber = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  });

const requiredNumber = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: "custom", message: "not a number" });
    return z.NEVER;
  }
  return n;
});

const nullableString = z.string().nullish().transform((v) => (v ? v : null));

export const ExtractionSchema = z.object({
  employerName: nullableString,
  jobTitle: nullableString,
  location: nullableString,
  stateForProfessionalTax: z.enum(STATE_CODES).nullish().transform((v) => v ?? null),
  ctcAnnual: z
    .union([z.number(), z.string(), z.null()])
    .nullish()
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  components: z.array(
    z.object({
      label: z.string(),
      kind: z.enum(COMPONENT_KINDS),
      amount: requiredNumber,
      frequency: z.enum(["monthly", "annual", "one_time", "unspecified"]),
      quote: z.string(),
    }),
  ),
  pfBasis: z.enum(["ceiling", "full_basic", "not_stated"]).catch("not_stated"),
  pfCeilingAmount: optionalNumber,
  clauses: z.array(
    z.object({
      type: z.enum(CLAUSE_TYPES),
      quote: z.string(),
      days: optionalNumber,
      months: optionalNumber,
      amount: optionalNumber,
      percent: optionalNumber,
    }),
  ),
  notes: z.array(z.string()).nullish().transform((v) => v ?? []),
});

type Parsed = z.output<typeof ExtractionSchema>;
type ParsedClause = Parsed["clauses"][number];

export type Clause = Omit<ParsedClause, "days" | "months" | "amount" | "percent"> & {
  days?: number;
  months?: number;
  amount?: number;
  percent?: number;
};

export type Extraction = Omit<Parsed, "clauses" | "pfCeilingAmount"> & {
  clauses: Clause[];
  /** The monthly PF wage ceiling the letter states, in rupees. */
  pfCeilingAmount?: number | null;
};
