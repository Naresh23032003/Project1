import type { Flag } from "@/lib/flags/flags";

function summary(flags: Flag[]): string {
  const red = flags.filter((f) => f.level === "red").length;
  const yellow = flags.length - red;
  const parts: string[] = [];
  if (red) parts.push(`${red} red ${red === 1 ? "flag" : "flags"}`);
  if (yellow) parts.push(`${yellow} ${yellow === 1 ? "thing" : "things"} worth checking`);
  return parts.join(" and ");
}

export function Flags({ flags }: { flags: Flag[] }) {
  return (
    <section className="section" aria-labelledby="flags-h">
      <h2 id="flags-h">Things to look at carefully</h2>
      {flags.length === 0 ? (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          We didn&apos;t find anything unusual in the clauses we check for, like bonds, clawbacks, long notice periods or non-competes. That doesn&apos;t make the letter perfect, so still read all of it.
        </p>
      ) : (
        <>
          <p className="muted" style={{ margin: "0.5rem 0 1rem" }}>
            We found {summary(flags)}. Each one quotes your letter.
          </p>
          {flags.map((f) => (
            <article className="flag" key={f.id}>
              <span className={`badge ${f.level === "red" ? "badge-red" : "badge-amber"}`}>{f.level === "red" ? "Red flag" : "Worth checking"}</span>
              <h3 style={{ marginTop: "0.6rem" }}>{f.title}</h3>
              {f.quote ? <blockquote>&ldquo;{f.quote}&rdquo;</blockquote> : null}
              <p>{f.why}</p>
              <p style={{ marginTop: "0.5rem" }}>
                <strong>Ask HR:</strong> {f.ask}
              </p>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
