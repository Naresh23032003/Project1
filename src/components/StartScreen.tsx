"use client";

import { useRef, useState } from "react";
import { extractTextFromFile, FileError } from "@/lib/client/extract-file";

interface Props {
  text: string;
  onText: (t: string) => void;
  onReview: () => void;
  onSample: () => void;
}

export function StartScreen({ text, onText, onReview, onSample }: Props) {
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    setBusy(true);
    try {
      const t = await extractTextFromFile(file);
      onText(t);
      setFileName(file.name);
    } catch (err) {
      setFileError(err instanceof FileError ? err.message : "We couldn't open that file. Try pasting the text instead.");
      setFileName(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const ready = text.trim().length >= 100;

  return (
    <div className="stack" style={{ paddingTop: "1.5rem" }}>
      <h1>Find out what you&apos;ll really take home.</h1>
      <p className="muted" style={{ fontSize: "1.1875rem" }}>
        Add your offer letter and see your monthly in-hand pay, what&apos;s guaranteed, and what to ask HR before you sign.
      </p>
      <p className="note">
        <strong>Your file stays on your device.</strong> We read it here in your browser. Names, phone numbers, emails and ID numbers are removed before anything is sent, and you check what&apos;s sent first.
      </p>

      <div style={{ paddingTop: "0.5rem" }}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            id="file"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <label htmlFor="file" className="btn btn-primary" style={{ cursor: "pointer" }}>
            {busy ? "Reading file…" : "Upload PDF or Word file"}
          </label>
          <button type="button" className="btn" onClick={onSample}>
            Try with a sample
          </button>
        </div>
        <div role="status" aria-live="polite" className="small" style={{ marginTop: "0.6rem" }}>
          {fileName && !fileError ? <span className="muted">Read {fileName}. Check the text below, then continue.</span> : null}
          {fileError ? (
            <span style={{ color: "var(--red-ink)", fontWeight: 600 }} role="alert">
              {fileError}
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="paste" className="label">
          Or paste the text of your letter
        </label>
        <textarea
          id="paste"
          className="field"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Paste the full letter here, including the salary table and the terms."
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={onReview} disabled={!ready}>
          Review what gets sent
        </button>
        {!ready ? <span className="small muted">Add at least a few lines of the letter to continue.</span> : null}
      </div>
    </div>
  );
}
