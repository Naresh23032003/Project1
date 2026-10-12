export function LoadingScreen() {
  return (
    <div className="stack" style={{ paddingTop: "3rem" }} role="status" aria-live="polite">
      <h1>Reading your letter.</h1>
      <p className="muted" style={{ fontSize: "1.1875rem" }}>
        We&apos;re pulling out the pay and the clauses, then checking every quote against your text. This usually takes 5 to 15 seconds.
      </p>
      <div className="progress" aria-hidden="true">
        <span />
      </div>
      <p className="small muted">The salary maths runs on your device once the reading is done.</p>
    </div>
  );
}
