export type RedactionKind = "name" | "email" | "phone" | "pan" | "aadhaar" | "address" | "id";

export interface Span {
  start: number;
  end: number;
  kind: RedactionKind;
}

const LABEL: Record<RedactionKind, string> = {
  name: "[NAME]",
  email: "[EMAIL]",
  phone: "[PHONE]",
  pan: "[PAN]",
  aadhaar: "[AADHAAR]",
  address: "[ADDRESS]",
  id: "[ID]",
};

const CAP = "(?:[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?|[A-Z]{2,})";
const NAME = `(?:[A-Z]\\.[ \\t]?)*${CAP}(?:[ \\t]+${CAP}){0,2}`;
const TITLE = "(?:Mr|MR|Mrs|MRS|Ms|MS|Miss|MISS|Dr|DR|Shri|Smt|Sri)";
const ID_VALUE = "([A-Za-z0-9][A-Za-z0-9\\-/_.]{2,})";

const GENERIC = new Set(["candidate", "sir", "madam", "applicant", "team", "all", "colleague", "student", "intern", "hiring", "manager", "hr", "sirs", "everyone"]);
const COMPANY_WORDS = /\b(?:Pvt|Ltd|Limited|Inc|LLP|Technologies|Systems|Solutions|Services|Corp|Corporation|Labs|Software|Consulting|Private)\b/;

interface Rule {
  kind: RedactionKind;
  re: RegExp;
  group?: number;
  skip?: (matched: string) => boolean;
}

const rules: Rule[] = [
  { kind: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g },
  { kind: "pan", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  { kind: "aadhaar", re: /(?<![\d,.])(?:\d{4}\s\d{4}\s\d{4}|\d{12})(?![\d,])/g },
  {
    kind: "phone",
    re: /(?<![\d,.])(?:\+91[\s-]?\d[\d\s-]{7,12}\d|(?:91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}|0\d{2,4}[\s-]\d{3,4}[\s-]?\d{4}|0\d{2,4}[\s-]?\d{6,8})(?![\d,])/g,
  },
  { kind: "id", re: new RegExp(`\\b(?:Employee|Emp|Staff|Candidate|Applicant)\\.?[ \\t]*(?:ID|Id|Code|No\\.?|Number)[ \\t]*[:\\-#]?[ \\t]*${ID_VALUE}`, "g"), group: 1 },
  { kind: "id", re: new RegExp(`\\b(?:Ref(?:erence)?|Offer|Letter)[ \\t]*(?:No\\.?|Number|ID|#)[ \\t]*[:\\-#]?[ \\t]*${ID_VALUE}`, "g"), group: 1 },
  { kind: "id", re: new RegExp(`\\bRef(?:erence)?[ \\t]*[:#][ \\t]*${ID_VALUE}`, "g"), group: 1 },
  { kind: "address", re: /\b(?:PIN|Pin|Pincode|PIN[ \t]?code|Pin[ \t]?code|Postal[ \t]code)[ \t]*[:\-]?[ \t]*([1-9]\d{2}[ \t]?\d{3})\b/g, group: 1 },
  { kind: "name", re: new RegExp(`\\b(?:Dear|Hi|Hello)[ \\t]+(?:${TITLE}\\.?[ \\t]+)?(${NAME})[ \\t]*[,:\\n]`, "g"), group: 1, skip: (m) => GENERIC.has(m.split(/\s+/)[0]!.toLowerCase()) },
  { kind: "name", re: new RegExp(`\\b${TITLE}\\.?[ \\t]+(${NAME})`, "g"), group: 1, skip: (m) => GENERIC.has(m.split(/\s+/)[0]!.toLowerCase()) },
  {
    kind: "name",
    re: new RegExp(`(?<!(?:Company|Employer|Organi[sz]ation|Business|Client|Project|Brand|Bank|Entity|Legal|Registered|Trade)[ \\t])\\b(?:(?:Candidate|Employee|Applicant|Full)[ \\t]+)?Name(?:[ \\t]+of[ \\t]+(?:the[ \\t]+)?(?:candidate|employee))?[ \\t]*[:\\-][ \\t]*(${NAME})`, "g"),
    group: 1,
  },
  { kind: "name", re: new RegExp(`^[ \\t]*To[,:]?[ \\t]*\\n[ \\t]*(?:${TITLE}\\.?[ \\t]+)?(${NAME})[ \\t]*$`, "gm"), group: 1, skip: (m) => COMPANY_WORDS.test(m) },
  {
    kind: "name",
    re: new RegExp(`\\b(?:Regards|Sincerely|Yours[ \\t]+(?:sincerely|faithfully|truly)|(?:Best|Warm|Kind)[ \\t]+regards)[ \\t]*,?[ \\t]*\\n[ \\t]*(${NAME})[ \\t]*(?=\\n|$)`, "g"),
    group: 1,
    skip: (m) => COMPANY_WORDS.test(m),
  },
  { kind: "name", re: new RegExp(`\\bI,[ \\t]+(${NAME})[ \\t]*,`, "g"), group: 1 },
  { kind: "name", re: new RegExp(`(?:\\b[SDWC]/o|\\b(?:Son|Daughter|Wife|Husband)[ \\t]+of)[ \\t]+(?:(?:Mr|Mrs|Ms|Shri|Late)\\.?[ \\t]+)?(${NAME})`, "g"), group: 1 },
  { kind: "name", re: new RegExp(`(${NAME})[ \\t]*,?[ \\t]*(?:[SDWC]/o)\\b`, "g"), group: 1 },
];

const ADDRESS_WORD = /\b(?:Road|Rd\.?|Street|St\.|Lane|Nagar|Layout|Colony|Apartments?|Flat|Plot|Floor|Sector|Block|Cross|Society|Villa|Residency|Enclave|Marg|Chowk)\b/;

const ENDS_IN_PIN = /,.*[-,]\s*[1-9]\d{2}\s?\d{3}\s*$/;
const MONEY_WORD = /\b(?:Rs|INR|CTC|per|annum|salary|LPA)\b|\u20B9/i;

function addressLines(text: string): Span[] {
  const spans: Span[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const isAddress = (ADDRESS_WORD.test(line) && /\d/.test(line)) || (ENDS_IN_PIN.test(line) && !MONEY_WORD.test(line));
    if (isAddress) {
      const lead = line.length - line.trimStart().length;
      const trimmed = line.trim();
      if (trimmed) spans.push({ start: offset + lead, end: offset + lead + trimmed.length, kind: "address" });
    }
    offset += line.length + 1;
  }
  return spans;
}

function merge(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      last.end = Math.max(last.end, s.end);
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

export function findRedactions(text: string): Span[] {
  const spans: Span[] = [...addressLines(text)];
  for (const rule of rules) {
    const re = new RegExp(rule.re.source, rule.re.flags.includes("d") ? rule.re.flags : rule.re.flags + "d");
    for (const m of text.matchAll(re)) {
      const g = rule.group ?? 0;
      const idx = (m as RegExpMatchArray & { indices?: ([number, number] | undefined)[] }).indices?.[g];
      if (!idx) continue;
      const matched = text.slice(idx[0], idx[1]);
      if (rule.skip?.(matched)) continue;
      spans.push({ start: idx[0], end: idx[1], kind: rule.kind });
    }
  }
  return merge(spans);
}

export function applyRedactions(text: string, spans: Span[]): string {
  const sorted = merge(spans);
  let out = "";
  let pos = 0;
  for (const s of sorted) {
    out += text.slice(pos, s.start) + LABEL[s.kind];
    pos = s.end;
  }
  return out + text.slice(pos);
}

export function redact(text: string): { redacted: string; spans: Span[] } {
  const spans = findRedactions(text);
  return { redacted: applyRedactions(text, spans), spans };
}
