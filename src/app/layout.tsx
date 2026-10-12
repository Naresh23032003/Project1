import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

// The ₹ sign is in the latin-ext file, so each family has a second file the browser only fetches when it needs it.
const display = localFont({ src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2", weight: "200 800", variable: "--f-display", display: "swap" });
const displayExt = localFont({ src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-wght-normal.woff2", weight: "200 800", variable: "--f-display-ext", display: "swap", preload: false, adjustFontFallback: false });
const body = localFont({ src: "../../node_modules/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2", weight: "200 900", variable: "--f-body", display: "swap" });
const bodyExt = localFont({ src: "../../node_modules/@fontsource-variable/source-sans-3/files/source-sans-3-latin-ext-wght-normal.woff2", weight: "200 900", variable: "--f-body-ext", display: "swap", preload: false, adjustFontFallback: false });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://inhand.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "InHand: what your offer letter really pays",
  description:
    "Paste or upload your job offer letter. See your monthly in-hand salary, what's guaranteed, and the clauses worth asking HR about. Your file never leaves your browser.",
  openGraph: {
    title: "InHand: what your offer letter really pays",
    description: "Monthly in-hand salary, what's guaranteed, and what to ask HR. Free, private, no sign-up.",
    type: "website",
    siteName: "InHand",
  },
  twitter: {
    card: "summary_large_image",
    title: "InHand: what your offer letter really pays",
    description: "Monthly in-hand salary, what's guaranteed, and what to ask HR.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e181d" },
  ],
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${displayExt.variable} ${body.variable} ${bodyExt.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="wrap flex items-center justify-between" style={{ paddingBlock: "1rem" }}>
          <Link href="/" className="no-underline" style={{ fontFamily: "var(--font-display)", fontWeight: 750, fontSize: "1.375rem", letterSpacing: "-0.02em", color: "var(--ink)", textDecoration: "none" }}>
            InHand
          </Link>
          <ThemeToggle />
        </header>
        <main id="main" className="wrap" style={{ paddingBottom: "3rem" }}>
          {children}
        </main>
        <footer className="wrap small muted" style={{ borderTop: "1px solid var(--rule)", paddingBlock: "1.5rem 3rem" }}>
          <p>InHand gives estimates from what your letter says. It isn&apos;t legal or tax advice.</p>
          <p className="flex flex-wrap gap-x-6" style={{ marginTop: "0.5rem" }}>
            <Link href="/privacy">How your data is handled</Link>
            <a href="https://github.com/Naresh23032003/Project1">Source code</a>
          </p>
        </footer>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
