# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, deployed on Vercel. Set in the project brief (docs/KICKOFF.md).

## Users

Freshers and early-career people in India reading their first or second job offer, usually on a phone after a WhatsApp or LinkedIn link. Many don't know the difference between CTC and in-hand pay, or what variable pay, bonds, notice periods and clawbacks mean for them. Nobody has explained it to them simply.

## Product Purpose

Paste or upload an offer letter and get a plain-English breakdown: the monthly in-hand salary, what is guaranteed and what isn't, the clauses worth a second look (quoted from the letter), and questions to ask HR. Success is a person who understands their offer well enough to ask the right questions before signing.

## Positioning

The letter never leaves the browser as a file, personal details are removed before anything is sent, and every number comes from tested code rather than from an AI guess. A neighbouring salary calculator can't truthfully say both.

## Operating Context

Offer letters arrive as PDF, Word or pasted text. They mix CTC tables, clauses and boilerplate. Users compare regimes (new and old income tax), PF, professional tax and variable pay. Results are estimates, not legal or tax advice.

## Capabilities and Constraints

- Text extraction from PDF and DOCX happens in the browser. Scanned PDFs are detected and the user is told to paste text instead.
- Redaction (names, emails, phones, PAN, Aadhaar, addresses, employee IDs) happens in the browser, with a preview the user approves.
- The server receives redacted text only, calls a language model for extraction, validates the JSON, and stores nothing.
- All money maths is deterministic TypeScript with tests. Tax and payroll rules live in one file with verification dates.
- Free to use. Per-IP daily limit and Cloudflare Turnstile protect the model budget.
- Not legal or tax advice. A short calm disclaimer sits near the results.

## Brand Commitments

Working name: InHand. Voice: a helpful person texting a friend who just got their first job. Short sentences, contractions, second person, sentence case, no emojis in UI copy. No em dashes or en dashes anywhere.
