# Plan: InHand (offer letter decoder)

Working name: **InHand**. Other options: Offer Lens (reads like a camera app), Clear Offer (generic). "In-hand" is the exact word freshers use, so InHand wins. You can change it any time; the name lives in one config file.

## 1. Screens

1. **Start.** Headline, one sentence on privacy, a drop zone for PDF/DOCX, a paste box, and a "Try with a sample" button. Scanned-PDF error and unsupported-file errors appear here.
2. **Review.** Shows the exact text that will leave the browser, with redactions highlighted. The user can click any word to redact it or click a redaction to undo it. Button: "Looks good, decode it". Turnstile runs here.
3. **Loading.** Plain progress copy (reading, checking quotes, calculating). No spinner-only screen.
4. **Results.**
   - In-hand hero number with new/old regime toggle and an expandable CTC-to-in-hand table.
   - Guaranteed vs not: stacked bar plus four buckets.
   - Things to look at: flag cards with quote, why, what to ask.
   - Questions for HR: copy button.
   - Share card: opt-in amounts, download as PNG (drawn client side on a canvas).
   - Short disclaimer.
5. **Privacy page**, **404**, **error and rate-limit states**.

## 2. Data flow

```
file or paste -> browser text extraction (pdf.js / mammoth)
              -> browser redaction + user review
              -> POST /api/decode {text, turnstileToken}   (redacted text only)
                    size cap -> Turnstile check -> rate limit -> Anthropic tool call
                    -> Zod validate (retry once) -> quote verification -> JSON out
              -> browser: calculator (pure TS) + flag rules (pure TS) -> UI
```

The server does extraction only. Money math and flag severity both run in the browser from the extracted values, so they are unit-testable and the model can't change a number after the fact. The server keeps nothing and logs nothing from the body. Vercel's default request logs hold method, path and status only; the README will say so.

## 3. Extraction schema (what the model returns)

```ts
Extraction = {
  employerName: string | null,            // company name is fine to send; person names are redacted
  jobTitle: string | null,
  location: string | null,                // city/state only, used for professional tax
  stateForProfessionalTax: StateCode | null,
  currency: "INR",
  ctcAnnual: number | null,               // as stated
  components: {
    label: string, quote: string,
    amount: number,                       // in rupees
    frequency: "monthly" | "annual" | "one_time" | "unspecified",
    kind: "basic" | "hra" | "special_allowance" | "other_allowance" | "dearness_allowance"
        | "employer_pf" | "gratuity" | "insurance" | "variable" | "retention_bonus"
        | "joining_bonus" | "relocation" | "esop" | "other"
  }[],
  pfWageBasis: "ceiling" | "full_basic" | "not_stated",
  clauses: {
    type: "service_bond" | "training_cost_recovery" | "notice_period" | "joining_bonus_clawback"
        | "non_compete" | "non_solicit" | "probation" | "unpaid_training" | "relocation"
        | "location_change" | "shift_change" | "variable_pay_discretion" | "ctc_includes_one_time"
        | "background_check" | "moonlighting" | "ip_assignment" | "other",
    quote: string,
    days?: number, months?: number, amount?: number, percent?: number
  }[],
  notes: string[]                         // things the letter leaves unstated
}
```

The model uses a forced tool call with this JSON schema. The server parses with Zod, retries once on failure, then returns a friendly error. Every `quote` is checked against the original text after normalising whitespace, case, quote marks and punctuation. Components or clauses with a missing quote are dropped. Dropped items are counted, and if a key component (CTC) was dropped the result is shown as incomplete.

## 4. Calculator design (`src/lib/calc`)

All figures come from `src/lib/rules/india.ts`, each with `lastVerified` and a source URL.

1. Normalise components to annual rupees. If only CTC is given, apply an editable default split (basic 40%, HRA 50% of basic, employer PF per basis, gratuity 4.81% of basic, rest special allowance) and show it as an assumption.
2. Buckets: monthly fixed (taxable), in CTC but not monthly (employer PF, gratuity, insurance), conditional (variable, retention), one-time.
3. Employee PF: 12% of PF wages. Wages = min(basic, ceiling) when on the ceiling (25,000 since 17 September 2026), else full basic. Both shown when the letter is silent.
4. Taxable income, new regime: gross taxable pay minus standard deduction, then slabs, rebate with marginal relief, surcharge, 4% cess.
5. Old regime: slabs, 50,000 standard deduction, optional HRA, 80C and other inputs, rebate up to 5 lakh taxable. Labelled as an estimate.
6. Professional tax by state, averaged across the year (Maharashtra and Karnataka February top-ups matter for the real February payslip, so the table also shows the month-by-month view).
7. In-hand monthly = (monthly fixed gross - employee PF - monthly tax - professional tax). Variable pay is excluded from the hero number and shown separately with its own tax effect.

Functions are pure, take plain objects and return a list of labelled steps, so the UI renders the same steps the tests check.

## 5. Flags (code decides, model only extracts)

| Flag | Rule | Level |
|---|---|---|
| Service bond | any `service_bond` clause | red |
| Training cost recovery | `training_cost_recovery` | red |
| Joining bonus clawback | `joining_bonus_clawback` | red |
| Non-compete | `non_compete` | red |
| Long notice | notice over 60 days, yellow; over 90, red | yellow/red |
| High variable share | variable over 15% of CTC, yellow; over 30%, red | yellow/red |
| CTC includes one-time items | `ctc_includes_one_time` or joining bonus counted in CTC | yellow |
| Unpaid training | `unpaid_training` | red |
| Vague probation | probation with no length or no confirmation criteria | yellow |
| Relocation clause | relocation repayment terms | yellow |
| Location/shift at employer's discretion | those two types | yellow |
| Moonlighting ban, IP assignment | only if broad | yellow |
| Basic under 50% of total | informational note, not a flag | info |

Each flag has fixed "why it matters" and "ask HR" text templates filled with the extracted numbers. Every flag shows its verified quote.

## 6. Verified figures (as of 2026-10-12)

**Limits of this check.** Government sites (incometaxindia.gov.in, incometax.gov.in, labour and EPFO portals, state PT portals) are blocked from this environment, and only web search worked. Everything below is cross-checked against several secondary sources, none of which is the official text. I mark each figure accordingly and the rules file will carry the same marks.

| Figure | Value | Status |
|---|---|---|
| New regime slabs FY 2026-27 | 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, above 24L 30% | Matches several sources and Budget 2026 coverage (no slab change). Not checked against the Act. |
| Standard deduction (new) | 75,000 | Same |
| Rebate | up to 60,000 for taxable income up to 12L, resident individuals | Same |
| Marginal relief above 12L | tax capped at income above 12L | Multiple sources agree |
| Cess | 4% | Long-standing; not re-checked |
| Surcharge, new regime | 10% above 50L, 15% above 1Cr, 25% above 2Cr, capped at 25% | Sources agree on tiers. Surcharge marginal relief is described inconsistently, so I'll implement the standard rule (surcharge never makes you worse off than the excess over the threshold) and flag it for review |
| Income-tax Act 2025 | in force from 1 April 2026; rates unchanged. Section numbers changed (one source says the rebate is now section 202) | The UI will not cite section numbers |
| Old regime | 0-2.5L nil, 2.5-5L 5%, 5-10L 20%, above 10L 30%; standard deduction 50,000; rebate 12,500 up to 5L taxable | From general knowledge, not re-searched |
| Employee PF | 12%. Ceiling Rs 25,000 a month from 17 September 2026 (this row was wrong at planning time: it said 15,000 and the rise was only proposed). Updated after official PIB and Labour Ministry releases were found | Official (employer side) |
| Labour Codes | in force from 21 Nov 2025. "Wages" = basic + DA + retaining allowance. Allowances excluded from wages are capped at 50% of total remuneration, the excess is added back. Gratuity and ESI are not counted in total remuneration for this test | Secondary (Labour Ministry FAQs as reported). Rules are still being notified |
| Gratuity | 15/26 of last wage per year of service; fixed-term employees eligible after 1 year under the codes | Secondary |

Professional tax (monthly unless noted; **all secondary sources, official state schedules not reachable**):

| State | Rule | Confidence |
|---|---|---|
| Karnataka | nil up to 24,999 gross; 200/month, 300 in February (max 2,500/yr) above 25,000 | Good |
| Maharashtra | men: nil to 7,500, 175 to 10,000, 200 above (300 in February). Women: nil to 25,000, then 200 (300 in Feb). Max 2,500/yr | Good |
| Telangana | nil to 15,000, 150 to 20,000, 200 above | Good |
| West Bengal | nil to 10,000, 110 to 15,000, 130 to 25,000, 150 to 40,000, 200 above | Good |
| Tamil Nadu | half-yearly, Greater Chennai rates from Oct 2024: nil to 21,000, 180, 425, 930, 1,025, 1,250 above 75,000 (planning-time bands were outdated) | Medium |
| Gujarat | nil to 12,000, 200 a month above (official; the lower bands in the original plan were outdated) | Good |
| Kerala | half-yearly: nil below 12,000 (official), then 120, 180, 300, 450, 600, 750, 1,000, 1,250 from 1,25,000 (secondary sources agree) | Medium |
| Delhi, Haryana | none | Good |

## 7. Test plan

Mirrors the testing bar in `CLAUDE.md`: tax boundary tests with hand-computed expectations, 15 golden letters (live runs excluded from CI), redaction tests (PII removed, salary figures kept), Playwright E2E with mocked API, screenshots at 360 and 1440 in both themes, axe, security checks. **Live golden runs need `ANTHROPIC_API_KEY`, which is not set in this session** (see section 8).

## 8. Things in the prompt that are wrong or missing

1. **Network is not Full.** Government and many vendor sites are blocked, so tax figures could only be verified against secondary sources. npm and GitHub reads work. Vercel.com is blocked from here, which doesn't matter because you do that step.
2. **`ANTHROPIC_API_KEY` is not set** in this session. I can build and test everything else, but golden-letter accuracy numbers can't be recorded until the key is in the environment and a new session starts.
3. **GitHub pushes return 403.** The Claude GitHub App isn't installed on this repo, so nothing has been pushed. Install it (or reconnect GitHub) before Phase 2 ends, or the Vercel step has nothing to deploy. The repo also had no first commit, so I used the identity you gave me.
4. **Rate limiting on Vercel's free tier** needs shared storage; in-memory counters reset per serverless instance. Plan: Upstash Redis (free tier) via the Vercel integration, falling back to in-memory in dev. That's two more env vars for you in Phase 6.
5. **Name redaction can't be perfect.** Regex and context cues (salutations, signature blocks, "Name:" fields) catch most names, not all. That's why the review screen lets you add redactions by tapping words, and the privacy page says plainly that it's best effort.
6. **Employer NPS** (up to 14% of basic, deductible in the new regime) shows up in some letters. I'll support it as an optional input, not default.
7. **Rules file will carry "unverified against official text"** markers wherever section 6 says so, so a later pass can clear them.
8. Packages: `npx skills add` was denied by the sandbox, so I vendored the Playwright CLI skill by copying it from a clone. Chromium is already installed, so no browser download.
