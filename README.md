# InHand

InHand reads your job offer letter and tells you what you'll actually be paid each month. You paste the text or upload a PDF or Word file, and you get four things: your monthly in-hand salary, which parts of the CTC are guaranteed, the clauses worth a second look (with the exact sentence quoted from your letter), and a list of questions to ask HR.

It's free, there's no sign-up, and it's built for people getting a first or second offer in India.

## Why it exists

A lot of freshers sign an offer without knowing what CTC means for their bank balance, or what a service bond, a joining bonus clawback or a 90 day notice period can cost them later. Most of them have nobody to ask. This tool is meant to be the friend who explains it.

## How privacy works

- The file never leaves your browser. PDF and Word text is read on your device with pdf.js and mammoth.
- Before anything is sent, the browser hides names where it can spot them, plus emails, phone numbers, PAN, Aadhaar-like numbers, street addresses, PIN codes and employee or reference numbers. You see the exact text that will be sent, with the hidden parts blacked out, and you can hide more words or show some again.
- The server gets only that redacted text. It runs a second redaction pass as a safety net, asks the language model to extract details, checks that every quote really appears in your text, and returns JSON. There is no database and nothing is stored.
- Name detection is best effort. It looks for greetings, signatures, labelled name fields and titles like Mr. or Ms. A name in an odd place can slip through, which is why the review step exists.
- The app never logs request bodies. The only thing the route logs is a short error code when something fails. Vercel's own request logs hold the time, path, status code and IP address, not the body. Rate limiting stores a counter next to an IP address for a day.
- Analytics are page views only (Vercel Web Analytics). No letter content or amounts go to analytics.

The privacy page in the app says the same thing in plain words.

## How the numbers are made

The language model only reads. It returns a JSON object with the pay components and the clauses it found, each with a quote. Everything after that is ordinary TypeScript in `src/lib`:

- `calc/` computes tax (new and old regime, rebate, marginal relief, surcharge, cess), PF, professional tax and the CTC to in-hand steps.
- `flags/` decides which clauses are worth a flag and how serious. The model never decides severity.
- `extract/verify.ts` drops any clause whose quote isn't in the letter, and any pay component whose quote and amount can't be found. It also nulls a CTC that doesn't appear in the text.
- All tax and payroll figures live in `src/lib/rules/india.ts`, each with a verification date and a source.

If the letter only gives a total CTC, InHand assumes a split (basic at 40% of CTC, HRA half of basic, gratuity 4.81% of basic, employer PF up to the statutory wage ceiling, which has been Rs 25,000 a month since 17 September 2026), says so on screen, and lets you change it.

### What has and hasn't been checked

Government sites can't be fetched from the build environment, but web search returned text from official pages, and the rules file records what each figure rests on. As of 12 October 2026:

- **Confirmed in official text:** the new regime slab ladder, the Rs 75,000 standard deduction and the Rs 60,000 rebate up to 12 lakh (income tax department and PIB); the old regime Rs 2.5 lakh exemption and Rs 12,500 rebate; the EPF wage ceiling of Rs 25,000 from 17 September 2026 (PIB and Labour Ministry); the Code on Wages 50 percent rule; professional tax for Karnataka, Maharashtra, Telangana, West Bengal and Gujarat.
- **Confirmed by several secondary sources only:** the new regime slabs staying unchanged for FY 2026-27, the Tamil Nadu (Greater Chennai) and Kerala professional tax bands, and the 50 percent HRA rate for Bengaluru, Hyderabad, Pune and Ahmedabad.
- **Not verified:** the old regime 5, 20 and 30 percent rates (long-standing but not in the pages found), and the employee side of the new PF ceiling (official releases state the employer side).

Before you rely on a figure, check it against the official source. None of this was read from a gazette PDF directly.

## Run it locally

You need Node 22.

```bash
npm install
cp .env.example .env.local   # then add a key
npm run dev
```

Open http://localhost:3000. The sample letter works without any keys.

### Environment variables

| Name | What it does |
|---|---|
| `LLM_PROVIDER` | `groq` (default) or `anthropic` |
| `GROQ_API_KEY` | Key for Groq. Used only on the server |
| `GROQ_MODEL` | Defaults to `llama-3.3-70b-versatile` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Used if `LLM_PROVIDER=anthropic`. Model defaults to `claude-haiku-5-5` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile. Leave both empty in development and the check is skipped |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared rate-limit counter. Without them the limit is kept in memory per server instance |
| `RATE_LIMIT_PER_DAY` | Decodes per IP per day. Defaults to 10 |
| `NEXT_PUBLIC_SITE_URL` | Used for the sitemap and share previews |

## Tests

```bash
npm test            # unit tests: tax, redaction, flags, extraction pipeline, API route
npm run test:e2e    # Playwright with mocked API responses, plus axe accessibility checks
npm run test:live   # runs the real model against the 15 golden letters (needs a key, not part of CI)
npm run check:text  # the writing rules: no long dashes, no banned words, no keys
```

The tax tests use values worked out by hand, not values copied from the code. The golden letters in `test/fixtures` are made-up offer letters with the expected extraction and expected flags next to each. Without a live key, the offline golden test checks that redaction keeps every pay figure, that every expected quote exists in the redacted letter, and that the calculator and flag rules give the expected flags.

## Deploy

Push to `main` and let Vercel build it. Add the environment variables above in the Vercel project settings, and turn on Web Analytics there if you want page views.

## Known limits

- Scanned PDFs have no text layer. InHand says so and asks you to paste the text.
- Letters in languages other than English aren't supported yet.
- Variable pay, bonuses and ESOPs aren't counted in the monthly figure.
- `npm audit` reports a moderate issue in `sprintf-js` through mammoth. It runs only in your own browser on your own file.

## License

MIT
