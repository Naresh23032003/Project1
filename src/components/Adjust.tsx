"use client";

import type { PfBasis } from "@/lib/calc/payroll";
import { HRA_METRO_CITIES, PF_WAGE_CEILING, STATE_NAMES, type StateCode } from "@/lib/rules/india";

export interface AdjustState {
  pf: PfBasis;
  state: StateCode;
  female: boolean;
  basicPct: number;
  rentMonthly: number;
  metro: boolean;
  extra80c: number;
  otherDeductions: number;
}

interface Props {
  value: AdjustState;
  onChange: (next: AdjustState) => void;
  assumedSplit: boolean;
  pfStated: boolean;
  stateStated: boolean;
}

function NumberField({ id, label, value, onChange, hint }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} className="field" inputMode="numeric" value={value ? String(value) : ""} placeholder="0" onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} />
      {hint ? <p className="small muted" style={{ marginTop: "0.25rem" }}>{hint}</p> : null}
    </div>
  );
}

export function Adjust({ value, onChange, assumedSplit, pfStated, stateStated }: Props) {
  const set = <K extends keyof AdjustState>(k: K, v: AdjustState[K]) => onChange({ ...value, [k]: v });

  return (
    <details>
      <summary>Change what we assumed</summary>
      <div className="stack" style={{ padding: "0.5rem 0 1rem" }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label">How your employer works out PF {pfStated ? "(your letter says)" : "(your letter doesn't say)"}</legend>
          <div className="seg" role="radiogroup">
            <label>
              <input type="radio" name="pf" checked={value.pf === "ceiling"} onChange={() => set("pf", "ceiling")} />
              Up to the Rs {PF_WAGE_CEILING.toLocaleString("en-IN")} ceiling
            </label>
            <label>
              <input type="radio" name="pf" checked={value.pf === "full_basic"} onChange={() => set("pf", "full_basic")} />
              On full basic
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="state" className="label">
            Where you&apos;ll work (for professional tax) {stateStated ? "" : "(not clear in your letter)"}
          </label>
          <select id="state" className="field" value={value.state} onChange={(e) => set("state", e.target.value as StateCode)}>
            {Object.entries(STATE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {value.state === "MH" ? (
          <label className="flex items-center gap-2" style={{ minHeight: 44, cursor: "pointer" }}>
            <input type="checkbox" checked={value.female} onChange={(e) => set("female", e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--money)" }} />
            Maharashtra charges women professional tax only above Rs 25,000 a month
          </label>
        ) : null}

        {assumedSplit ? (
          <div>
            <label htmlFor="basic" className="label">
              Basic pay as a share of CTC: {value.basicPct}%
            </label>
            <input id="basic" type="range" min={20} max={70} step={1} value={value.basicPct} onChange={(e) => set("basicPct", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--money)", minHeight: 44 }} />
            <p className="small muted">Most employers set basic at 40% to 50% of CTC. Ask HR for your real number.</p>
          </div>
        ) : null}

        <p className="label" style={{ margin: "0.5rem 0 0" }}>
          For the old tax regime only
        </p>
        <NumberField id="rent" label="Rent you pay each month" value={value.rentMonthly} onChange={(n) => set("rentMonthly", n)} hint="Used for the HRA exemption." />
        <label className="flex items-center gap-2" style={{ minHeight: 44, cursor: "pointer" }}>
          <input type="checkbox" checked={value.metro} onChange={(e) => set("metro", e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--money)" }} />
          I live in {HRA_METRO_CITIES.slice(0, -1).join(", ")} or {HRA_METRO_CITIES[HRA_METRO_CITIES.length - 1]}
        </label>
        <NumberField id="c80" label="Other 80C savings in a year" value={value.extra80c} onChange={(n) => set("extra80c", n)} hint="Like ELSS or insurance. Your PF already counts. The limit is Rs 1,50,000 in total." />
        <NumberField id="oth" label="Other deductions in a year" value={value.otherDeductions} onChange={(n) => set("otherDeductions", n)} hint="Like health insurance premium or an education loan." />
      </div>
    </details>
  );
}
