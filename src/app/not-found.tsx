import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack" style={{ paddingTop: "2rem" }}>
      <h1>That page doesn&apos;t exist.</h1>
      <p className="muted" style={{ fontSize: "1.1875rem" }}>
        Check the link, or go back and decode your offer letter.
      </p>
      <Link className="btn btn-primary" href="/">
        Go to the decoder
      </Link>
    </div>
  );
}
