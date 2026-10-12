import type { Extraction } from "./schema";

export function normalizeForMatch(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

const MIN_QUOTE_LENGTH = 12;

export function quoteAppears(quote: string, source: string): boolean {
  const hay = normalizeForMatch(source);
  const parts = quote.split(/\.{3}|…/).map(normalizeForMatch).filter((p) => p.length > 0);
  if (parts.length === 0) return false;
  if (parts.reduce((n, p) => n + p.length, 0) < MIN_QUOTE_LENGTH) return false;
  return parts.every((p) => hay.includes(p));
}

export function amountAppears(amount: number, source: string): boolean {
  const text = source.replace(/(\d)[,](?=\d)/g, "$1");
  const whole = String(Math.round(amount));
  if (new RegExp(`(?<![\\d.])${whole}(?![\\d])`).test(text)) return true;
  const lakh = amount / 100_000;
  const crore = amount / 10_000_000;
  const num = (n: number) => String(Number(n.toFixed(4))).replace(".", "\\.");
  if (new RegExp(`(?<![\\d.])${num(lakh)}\\s*(?:lpa|lakhs?|lacs?|l\\b)`, "i").test(text)) return true;
  if (new RegExp(`(?<![\\d.])${num(crore)}\\s*(?:cr\\b|crores?)`, "i").test(text)) return true;
  return false;
}

export interface Dropped {
  components: number;
  clauses: number;
  ctc: boolean;
}

export function sanitizeExtraction(raw: Extraction, source: string): { extraction: Extraction; dropped: Dropped } {
  const components = raw.components.filter((c) => quoteAppears(c.quote, source) || amountAppears(c.amount, source));
  const clauses = raw.clauses.filter((c) => quoteAppears(c.quote, source));
  const ctcOk = raw.ctcAnnual == null || amountAppears(raw.ctcAnnual, source);
  const ceilingOk = raw.pfCeilingAmount == null || amountAppears(raw.pfCeilingAmount, source);
  return {
    extraction: { ...raw, components, clauses, ctcAnnual: ctcOk ? raw.ctcAnnual : null, pfCeilingAmount: ceilingOk ? (raw.pfCeilingAmount ?? null) : null },
    dropped: {
      components: raw.components.length - components.length,
      clauses: raw.clauses.length - clauses.length,
      ctc: !ctcOk,
    },
  };
}
