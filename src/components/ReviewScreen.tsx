"use client";

import { useMemo, useState } from "react";
import { applyRedactions, findRedactions, type RedactionKind, type Span } from "@/lib/redact/redact";
import { Turnstile, turnstileSiteKey } from "./Turnstile";

interface Props {
  text: string;
  onBack: () => void;
  onDecode: (redacted: string, token: string | null) => void;
}

const KIND_WORD: Record<RedactionKind, [string, string]> = {
  name: ["name", "names"],
  email: ["email", "emails"],
  phone: ["phone number", "phone numbers"],
  pan: ["PAN", "PANs"],
  aadhaar: ["Aadhaar number", "Aadhaar numbers"],
  address: ["address", "addresses"],
  id: ["ID number", "ID numbers"],
};

export function ReviewScreen({ text, onBack, onDecode }: Props) {
  const [spans, setSpans] = useState<Span[]>(() => findRedactions(text));
  const [extra, setExtra] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const tooLong = text.length > 25_000;

  const sorted = useMemo(() => [...spans].sort((a, b) => a.start - b.start), [spans]);

  const counts = useMemo(() => {
    const c = new Map<RedactionKind, number>();
    for (const s of spans) c.set(s.kind, (c.get(s.kind) ?? 0) + 1);
    return [...c.entries()].map(([k, n]) => `${n} ${KIND_WORD[k][n === 1 ? 0 : 1]}`);
  }, [spans]);

  const segments = useMemo(() => {
    const out: { key: string; node: React.ReactNode }[] = [];
    let pos = 0;
    const plain = (from: number, to: number) => {
      const chunk = text.slice(from, to);
      let offset = from;
      for (const part of chunk.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) out.push({ key: `s${offset}`, node: part });
        else out.push({ key: `w${offset}`, node: <span className="w" data-start={offset} data-end={offset + part.length}>{part}</span> });
        offset += part.length;
      }
    };
    for (const s of sorted) {
      plain(pos, s.start);
      const label = `[${s.kind === "id" ? "ID" : s.kind.toUpperCase()}]`;
      out.push({
        key: `r${s.start}`,
        node: (
          <button type="button" className="redacted" onClick={() => setSpans((cur) => cur.filter((x) => x !== s))} aria-label={`${label} hidden. Press to show this text again.`} title="Press to show this text again">
            {label}
          </button>
        ),
      });
      pos = s.end;
    }
    plain(pos, text.length);
    return out;
  }, [sorted, text]);

  function onLetterClick(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".w");
    if (!el) return;
    const start = Number(el.dataset.start);
    const end = Number(el.dataset.end);
    setSpans((cur) => [...cur, { start, end, kind: "name" }]);
  }

  function addPhrase() {
    const phrase = extra.trim();
    if (phrase.length < 2) return;
    const found: Span[] = [];
    const lower = text.toLowerCase();
    const needle = phrase.toLowerCase();
    let i = lower.indexOf(needle);
    while (i !== -1) {
      found.push({ start: i, end: i + phrase.length, kind: "name" });
      i = lower.indexOf(needle, i + phrase.length);
    }
    if (found.length) {
      setSpans((cur) => [...cur, ...found.filter((f) => !cur.some((c) => f.start < c.end && f.end > c.start))]);
    }
    setExtra("");
  }

  const redacted = useMemo(() => applyRedactions(text, spans), [text, spans]);
  const needsToken = Boolean(turnstileSiteKey);

  return (
    <div className="stack" style={{ paddingTop: "1.5rem" }}>
      <h1>Check what gets sent.</h1>
      <p className="muted" style={{ fontSize: "1.1875rem" }}>
        This is the exact text that will be sent to read your letter. Black tags are hidden. Tap any word to hide it, or tap a tag to show it again.
      </p>

      <p role="status" aria-live="polite" className="small">
        {counts.length ? <strong>Hidden: {counts.join(", ")}.</strong> : <strong>Nothing was hidden automatically.</strong>} Salary figures and clauses are kept so we can read them.
      </p>

      {tooLong ? (
        <p className="note" role="alert">
          This text is longer than we can read (25,000 characters). Go back and paste just the offer letter.
        </p>
      ) : null}

      <div className="letter" onClick={onLetterClick} role="region" aria-label="Text that will be sent" tabIndex={0}>
        {segments.map((s) => (
          <span key={s.key}>{s.node}</span>
        ))}
      </div>

      <div>
        <label htmlFor="extra" className="label">
          Hide another word or phrase
        </label>
        <div className="flex gap-2">
          <input
            id="extra"
            className="field"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPhrase();
              }
            }}
            placeholder="For example, a college or street name"
            autoComplete="off"
          />
          <button type="button" className="btn" onClick={addPhrase}>
            Hide
          </button>
        </div>
      </div>

      <Turnstile onToken={setToken} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={tooLong || (needsToken && !token)} onClick={() => onDecode(redacted, token)}>
          Looks good, decode it
        </button>
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          Back
        </button>
      </div>
      {needsToken && !token ? <p className="small muted">Waiting for the quick human check above.</p> : null}
    </div>
  );
}
