import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How InHand handles your data",
  description: "What stays in your browser, what is sent, what is stored (nothing), and what is logged.",
};

export default function Privacy() {
  return (
    <article className="stack" style={{ paddingTop: "1.5rem" }}>
      <h1>How your data is handled.</h1>
      <p className="muted" style={{ fontSize: "1.1875rem" }}>
        Short version: your file stays on your device, personal details are removed before anything is sent, and nothing is saved.
      </p>

      <h2 style={{ paddingTop: "1rem" }}>What stays in your browser</h2>
      <p>
        When you upload a PDF or Word file, your browser reads the text. The file itself is never uploaded. Redaction also happens in your browser. You see exactly what will be sent and can hide more words before you press the button.
      </p>

      <h2 style={{ paddingTop: "1rem" }}>What is removed before sending</h2>
      <p>
        We hide names where we can spot them (greetings, signatures, labelled name fields), email addresses, phone numbers, PAN, Aadhaar-like numbers, street addresses, PIN codes and employee or reference numbers. Salary figures and clauses are kept, because they are what we need to read.
      </p>
      <p>
        This is best effort. Names written in unusual places can slip through, which is why you get to review the text first. A second automatic pass runs on the server as a safety net.
      </p>

      <h2 style={{ paddingTop: "1rem" }}>What the server does</h2>
      <p>
        The server receives the redacted text, asks a language model to read it and return structured details, checks that every quote really appears in your text, and sends the result back. It doesn&apos;t keep your text, the result, or anything that identifies you. There is no database.
      </p>
      <p>
        The language model provider (currently Groq) processes the redacted text to answer the request. Don&apos;t paste anything you wouldn&apos;t want a service to read, and hide anything personal that we missed.
      </p>

      <h2 style={{ paddingTop: "1rem" }}>What is logged</h2>
      <p>
        The app never writes your text or the result to any log. Our hosting provider keeps standard request logs (time, path, status code, and your network address). Those don&apos;t include the request body. To stop one person from running up costs, we count requests per network address for a day. That count is a number next to an address, not your letter.
      </p>
      <p>
        Page views are counted with privacy-friendly analytics. Letter content and amounts are never sent to analytics.
      </p>

      <h2 style={{ paddingTop: "1rem" }}>Who does the maths</h2>
      <p>
        The language model only reads. Every rupee figure is calculated by ordinary code running in your browser, using tax rules listed in one file in the open source repository, each with the date it was last checked.
      </p>

      <h2 style={{ paddingTop: "1rem" }}>Not advice</h2>
      <p>
        InHand gives estimates from what your letter says. It isn&apos;t legal or tax advice. Your employer&apos;s payroll may differ. Check anything important with HR or a tax professional.
      </p>

      <p style={{ paddingTop: "1rem" }}>
        <Link href="/">Back to the decoder</Link>
      </p>
    </article>
  );
}
