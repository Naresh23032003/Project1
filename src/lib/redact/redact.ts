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

const CAP = "(?:[A-Z][a-z]+(?:[-'][