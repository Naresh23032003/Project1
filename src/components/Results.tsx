"use client";

import { useMemo, useState } from "react";
import { analyse, type Analysis } from "@/lib/analyse";
import type { Regime } from "@/lib/calc/salary";
import type { Extraction } from "@/lib/extract/schema";
import { buildFlags, buildQuestions } from "@/lib/flags/flags";
import { formatINR, formatPercent } from "@/lib/format";
import { Adjust, type AdjustState } from "./Adjust";
import { Buckets } from "./Buckets";
import { Flags } from "./Flags";
import { Ledger } from "./Ledger";
import { Questions } from "./Questions";
import { ShareCard } from "./ShareCard";

function safeAnalyse(extraction: Extraction, adjust: AdjustState, touched: { pf: boolean; state: boolean }): Analysis | null {
  try {
    return analyse(extraction, {
      pfBasis: touched.pf || extraction.pfBasis !== "not_stated" ? adjust.pf : undefined,
      state: touched.state || extraction.stateForProfessionalTax != null ? adjust.state : undefined,
      female: adjust.female,
      split: { basicShareOfCtc: adjust.basicPct / 100 },
      old: { rentPaidAnnual: adjust.rentMonthly * 12, metro: adjust.metro, extra80C: adjust.extra80c, otherDeductions: adjust.otherDeductions },
    });
  } catch {
    return null;
  }
}

export function Results({ extraction, sample, onStartOver }: { extraction: Extraction; sample: boolean; onStartOver: () => void }) {
  const [regime, setRegime] = useState<Regime>("new");
  const [touched, setTouched] = useState({ pf: false, state: false });
  const [adjust, setAdjust] = useState<AdjustState>({
    pf: extraction.pfBasis === "full_basic" ? "full_basic" : "ceiling",
    state: extraction.stateForProfessionalTax ?? "OTHER",
    female: false,
    basicPct: 40,
    rentMonthly: 0,
    metro: true,
    extra80c: 0,
    otherDeductions: 0,
  });

  const a = useMemo(() => safeAnalyse(extraction, adjust, touched), [extraction, adjust, touched]);

  if (!a) {
    const ctx = { ctcAnnual: extraction.ctcAnnual ?? 0, variableAnnual: 0, assumedSplit: false, wageShareBelowHalf: false };
    const flags = buildFlags(extraction, ctx);
    return (
      <div style={{ paddingTop: "1.5rem" }}>
        <h1>We found clauses, but no pay details.</h1>
        <p className="muted" style={{ margin: "1rem 0", fontSize: "1.1875rem" }}>
          Your letter doesn&apos;t seem to state a CTC or a salary breakup, so we can&apos;t work out your monthly pay. Here is what we did find.
        </p>
        <Flags flags={flags} />
        <Questions questions={buildQuestions(extraction, flags, ctx)} />
        <button type="button" className="btn" onClick={onStartOver}>
          Start over
        </button>
      </div>
    );
  }

  const r = a.salary.regimes[regime];
  const other: Regime = regime === "new" ? "old" : "new";
  const o = a.salary.regimes[other];
  const redCount = a.flags.filter((f) => f.level === "red").length;
  const estimateReasons = [...a.salary.assumptions, ...(a.pfAssumed ? ["Your letter doesn't say how PF is worked out, so we used the statutory wage ceiling of Rs 25,000 a month (in force since 17 September 2026). Change it below to see the other case."] : []), ...(a.stateAssumed ? ["We couldn't tell which state you'll work in, so professional tax is left out. Pick your state below."] : []), ...a.salary.warnings];
  const wageShare = Math.round(a.salary.wageCode.wageShare * 100);

  return (
    <div>
      {sample ? (
        <div className="note flex flex-wrap items-center justify-between gap-3" style={{ marginTop: "1rem" }}>
          <span>This is a made-up sample letter. Nothing was sent anywhere.</span>
          <button type="button" className="btn" onClick={onStartOver}>
            Use my own letter
          </button>
        </div>
      ) : null}

      <section style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }} aria-labelledby="hero-h">
        <h1 id="hero-h" style={{ fontWeight: 500, fontSize: "1.375rem", lineHeight: 1.3 }}>
          You&apos;ll take home about
          <span className="figure" style={{ display: "block", margin: "0.4rem 0 0.2rem" }} data-testid="in-hand">
            {formatINR(r.monthlyInHand)}
          </span>
          <span style={{ fontWeight: 500 }}>a month{regime === "old" ? " under the old tax regime" : ""}.</span>
        </h1>

        <fieldset style={{ border: 0, padding: 0, margin: "1.25rem 0 0" }}>
          <legend className="sr-only">Income tax regime</legend>
          <div className="seg" role="radiogroup" aria-label="Income tax regime">
            <label>
              <input type="radio" name="regime" checked={regime === "new"} onChange={() => setRegime("new")} />
              New regime
            </label>
            <label>
              <input type="radio" name="regime" checked={regime === "old"} onChange={() => setRegime("old")} />
              Old regime
            </label>
          </div>
        </fieldset>

        <p style={{ marginTop: "1rem" }}>
          Your fixed pay is {formatINR(r.monthlyGross)} a month. After PF ({formatINR(r.monthlyEmployeePf)}), income tax ({formatINR(r.monthlyTax)}) and professional tax ({formatINR(r.monthlyPt)}), you keep {formatPercent(r.monthlyInHand / r.monthlyGross)} of it. Variable pay and one-time bonuses aren&apos;t counted.
        </p>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          Under the {other} regime it would be about {formatINR(o.monthlyInHand)} a month.
          {regime === "new" ? " The new regime is the default unless you tell your employer otherwise." : " This assumes only the deductions you add in the panel below."}
        </p>
        {r.variable ? (
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            {r.variable.extraTax > 0
              ? `If you get all of your ${formatINR(r.variable.annual)} variable pay, about ${formatINR(r.variable.afterTax)} of it reaches you after extra tax.`
              : `If you get all of your ${formatINR(r.variable.annual)} variable pay, you'd still owe no extra tax, so the full amount reaches you.`}
          </p>
        ) : null}

        {a.salary.notices.length > 0 ? (
          <div className="note" style={{ marginTop: "1rem" }}>
            <strong>Good to know:</strong>
            <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }} className="stack bullets">
              {a.salary.notices.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {estimateReasons.length > 0 ? (
          <details className="note" style={{ marginTop: "1.25rem" }}>
            <summary>{a.salary.assumedSplit ? "This is an estimate. See what we assumed." : "See what we assumed and noticed."}</summary>
            <ul style={{ margin: "0.5rem 0 0.25rem", paddingLeft: "1.2rem" }} className="stack bullets">
              {estimateReasons.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </details>
        ) : null}

        <div style={{ marginTop: "1rem" }}>
          <details>
            <summary>How we got this number</summary>
            <Ledger bridge={a.salary.ctcBridge} steps={r.steps} />
          </details>
          <Adjust
            value={adjust}
            onChange={(next) => {
              setTouched((t) => ({ pf: t.pf || next.pf !== adjust.pf, state: t.state || next.state !== adjust.state }));
              setAdjust(next);
            }}
            assumedSplit={a.salary.assumedSplit}
            pfStated={extraction.pfBasis !== "not_stated"}
            stateStated={extraction.stateForProfessionalTax != null}
          />
        </div>

        {a.salary.wageCode.belowHalf && !a.salary.assumedSplit ? (
          <p className="note" style={{ marginTop: "1rem" }}>
            <strong>Good to know:</strong> your basic pay is about {wageShare}% of your pay. Under the new labour codes (in force since 21 November 2025), PF and gratuity may be worked out on at least half of your pay. That can mean a bigger PF cut each month and a bigger gratuity later. Ask HR which base they use.
          </p>
        ) : null}

        <p className="small muted" style={{ marginTop: "1rem" }}>
          These are estimates from what your letter says. They aren&apos;t legal or tax advice. Your employer&apos;s payroll may differ.
        </p>
      </section>

      <Buckets salary={a.salary} />
      <Flags flags={a.flags} />
      <Questions questions={a.questions} />
      <ShareCard data={{ flagCount: a.flags.length, redCount, inHand: Math.round(r.monthlyInHand), ctc: a.salary.ctcAnnual }} />

      <div className="section">
        <button type="button" className="btn" onClick={onStartOver}>
          Decode another letter
        </button>
      </div>
    </div>
  );
}
