import { Fragment } from "react";
import { formatINR } from "@/lib/format";
import type { Step } from "@/lib/calc/salary";

const nb = (t: string) => t.replace(/in-hand/g, "in‑hand");

function Rows({ steps }: { steps: Step[] }) {
  return (
    <>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const cls = last && s.sign === "=" ? "total" : s.sign === "=" ? "sub" : "main";
        const sign = s.sign === "-" ? "−" : "";
        return (
          <Fragment key={s.id}>
            <tr className={cls}>
              <td>
                {s.sign === "-" ? <span className="sr-only">Minus </span> : null}
                {nb(s.label)}
              </td>
              <td>
                {sign}
                {formatINR(s.monthly)}
              </td>
              <td>
                {sign}
                {formatINR(s.annual)}
              </td>
            </tr>
            {s.sign !== "=" ? (
              <tr className="exp">
                <td colSpan={3}>{s.explain}</td>
              </tr>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

export function Ledger({ bridge, steps }: { bridge: Step[]; steps: Step[] }) {
  return (
    <div className="stack" style={{ paddingTop: "0.5rem" }}>
      <table className="ledger">
        <caption className="sr-only">From your CTC to your fixed pay</caption>
        <thead>
          <tr>
            <th scope="col">From CTC to fixed pay</th>
            <th scope="col">Per month</th>
            <th scope="col">Per year</th>
          </tr>
        </thead>
        <tbody>
          <Rows steps={bridge} />
        </tbody>
      </table>
      <table className="ledger" style={{ marginTop: "2rem" }}>
        <caption className="sr-only">From your fixed pay to your in-hand pay</caption>
        <thead>
          <tr>
            <th scope="col">{"From fixed pay to in‑hand"}</th>
            <th scope="col">Per month</th>
            <th scope="col">Per year</th>
          </tr>
        </thead>
        <tbody>
          <Rows steps={steps} />
        </tbody>
      </table>
    </div>
  );
}
