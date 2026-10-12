"use client";

import { useState } from "react";

export function Questions({ questions }: { questions: string[] }) {
  const [status, setStatus] = useState("");

  async function copy() {
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied. Paste it into your email or chat with HR.");
    } catch {
      setStatus("Your browser blocked copying. Select the list and copy it by hand.");
    }
  }

  if (questions.length === 0) return null;

  return (
    <section className="section" aria-labelledby="q-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="q-h">Questions to ask HR</h2>
        <button type="button" className="btn" onClick={copy}>
          Copy the list
        </button>
      </div>
      <ol style={{ margin: "1rem 0 0", paddingLeft: "1.6rem" }} className="stack numbered">
        {questions.map((q) => (
          <li key={q} style={{ paddingLeft: "0.25rem" }}>
            {q}
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="small muted" style={{ marginTop: "0.75rem", minHeight: "1.5rem" }}>
        {status}
      </p>
    </section>
  );
}
