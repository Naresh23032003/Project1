import type { SalaryResult } from "@/lib/calc/salary";
import { formatINR, formatPercent } from "@/lib/format";

const META = [
  {
    key: "fixed" as const,
    title: "Paid to you every month",
    color: "var(--seg-fixed)",
    desc: "Basic, HRA and allowances. This is what your monthly pay is built from, before PF, tax and other deductions.",
  },
  {
    key: "notMonthly" as const,
    title: "In your CTC, but not in your monthly pay",
    color: "var(--seg-hidden)",
    desc: "Your employer's PF, gratuity and insurance. They count towards your CTC, but they don't reach your bank account each month.",
  },
  {
    key: "conditional" as const,
    title: "Depends on performance or conditions",
    color: "var(--seg-cond)",
    desc: "Variable pay or a retention bonus. You get it only if you or the company hit targets, or you stay long enough.",
  },
  {
    key: "oneTime" as const,
    title: "One-time money",
    color: "var(--seg-once)",
    desc: "A joining bonus or relocation money, paid once. Depending on your letter it can sit on top of your CTC or inside it.",
  },
];

export function Buckets({ salary }: { salary: SalaryResult }) {
  const total = Math.max(salary.ctcAnnual, ...[Object.values(salary.buckets).reduce((n, b) => n + b.annual, 0)]);
  const rows = META.filter((m) => salary.buckets[m.key].annual > 0);

  return (
    <section className="section" aria-labelledby="buckets-h">
      <h2 id="buckets-h">What&apos;s guaranteed and what isn&apos;t</h2>
      <p className="muted" style={{ margin: "0.5rem 0 1.25rem" }}>
        Your CTC of {formatINR(salary.ctcAnnual)} a year is not all money you can count on each month. Here&apos;s how it splits.
      </p>
      <div className="bar" role="img" aria-label={rows.map((m) => `${m.title}: ${formatPercent(salary.buckets[m.key].annual / salary.ctcAnnual)}`).join(". ")}>
        {rows.map((m) => (
          <span key={m.key} style={{ width: `${(salary.buckets[m.key].annual / total) * 100}%`, background: m.color }} />
        ))}
      </div>
      <div style={{ marginTop: "1rem" }}>
        {rows.map((m) => {
          const b = salary.buckets[m.key];
          return (
            <div className="bucket" key={m.key}>
              <div className="title">
                <span className="swatch" style={{ background: m.color }} aria-hidden="true" />
                <span>{m.title}</span>
              </div>
              <div className="amt">
                {formatINR(b.annual)} <span className="muted" style={{ fontWeight: 500 }}>({formatPercent(b.shareOfCtc)})</span>
              </div>
              <div className="desc">
                {m.desc}
                {b.items.length > 0 ? (
                  <>
                    {" "}
                    <span>{b.items.map((i) => `${i.label.replace(/ \(assumed\)$/, "")} ${formatINR(i.annual)}`).join(", ")}.</span>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
