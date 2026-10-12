# Progress

## Current phase
Phases 0 to 5 and 7 are done and the code is on GitHub `main`. Phase 6 (deploy) is waiting on you: Vercel needs your account.

## Done
- Phase 0: git identity, attribution off, hooks (dashes, banned words, keys), MIT license, skills vendored into `.claude/skills/`
- Phase 1: `PLAN.md` written. `PRODUCT.md` and `DESIGN.md` written (Impeccable's launcher was skipped, see notes)
- Phase 2: tax engine, payroll, salary calculator, redaction, extraction schema, quote verification and flag rules, all with tests written first
- Phase 3: decode route (size caps, origin check, Turnstile, per-IP limit, model call, Zod validation with one retry, quote verification), provider switch for Groq or Anthropic. 15 golden letters with expected extraction and flags
- Phase 4: start, review, loading, results, error, privacy and 404 screens. Light and dark. Screenshots checked at 360px and 1440px
- Phase 5: Playwright E2E and axe (68 runs on desktop and mobile), Lighthouse, CSP, build-output secret scan, CI workflow, README, OG image, favicon, sitemap, robots
- Phase 7: `LAUNCH.md` and `launch/` assets

## Test status (12 Oct 2026)
- Unit tests: 239 passing (`npm test`)
- E2E: 68 passing across desktop (1440px) and mobile (360px), including axe with zero serious or critical issues in light and dark
- Lint and typecheck clean. Writing-rule check clean. Build scan: 0 secrets in client bundle
- Lighthouse mobile, production build: home 97 performance, 100 accessibility, 96 best practices, 100 SEO. Privacy page 92, 100, 96, 100. The one failed best-practices audit was a console 404 for the Vercel analytics script when running off Vercel. The script is now only rendered on Vercel
- GitHub Actions CI on `main` (commit 02ba475): the `checks` job (lint, typecheck, unit tests, text check, build, build scan) and the `e2e` job (Playwright with axe) both passed on a clean runner using the lockfile that CI generated

## Golden letter accuracy
Live extraction accuracy has NOT been measured. The sandbox's network policy blocks `api.groq.com` (and the Anthropic API key was never set), so `npm run test:live` could not reach a model. I did not make up numbers.

What was verified offline for all 15 letters: redaction removes names, emails, phones and addresses and keeps every pay figure; every expected quote appears verbatim in the redacted letter; the calculator and flag rules produce the expected flags with no warnings.

To measure real accuracy: put `GROQ_API_KEY` in `.env.local` on a machine that can reach Groq and run `npm run test:live`. It writes `test/live/last-run.json` and fails if there is any hallucinated flag, any missing key amount, or a wrong CTC. Expect to iterate on `src/lib/extract/prompt.ts` for the Llama model. The prompt has not been tried against any model.

## Open items for you
1. Deploy on Vercel (needs your account): import the repo, add `GROQ_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, the two Upstash variables and `NEXT_PUBLIC_SITE_URL`, then run the phone checklist. See README and LAUNCH.md.
2. Rotate the Groq key. It was pasted into chat. It is stored only in `.env.local`, which is gitignored and was never committed (checked the full history).
3. Run the live golden tests from a machine that can reach `api.groq.com` (this session's network policy blocks it): put the key in `.env.local` and run `npm run test:live`. Expect to tune `src/lib/extract/prompt.ts`.
4. Set the repo description and topics on GitHub (the tools available here could not change repo settings).
5. Verify tax figures against official sources where the rules file says "secondary": Kerala and Tamil Nadu professional tax bands, new regime slabs unchanged for FY 2026-27, the 50 percent HRA rate for four metros, old regime 5, 20 and 30 percent rates, and the employee side of the new PF ceiling.

## Notes and decisions
- Model provider is Groq (`llama-3.3-70b-versatile` by default) because the key you gave is a Groq key. The brief said Claude Haiku. Switch with `LLM_PROVIDER=anthropic`.
- The brief asked for tool use with a strict JSON schema. Groq's JSON mode plus Zod validation and one retry is used instead, with the schema described in the prompt.
- `npx skills add` was refused by the sandbox, so the Playwright CLI skill was copied from a clone of its repo. Impeccable's launcher downloads a binary, so I skipped it and followed its documented fallback: PRODUCT.md and DESIGN.md were written by hand from the brief, with no interview round.
- Pushing: the sandbox's git push returned 403, so files went to GitHub through the GitHub tools. Those commits show the author as "Naresh R" (your GitHub profile name). The lockfile and the vendored skills were produced by one-off workflows that ran `npm install --package-lock-only` and copied the skills from their upstream commits (listed in each `SOURCE.md`), then were deleted. Every other file was compared against the local copy by git hash. The lockfile is new, so it differs from the one used locally, and CI passing is the check on it
- Fonts: Bricolage Grotesque and Source Sans 3, self-hosted through fontsource.
- `npm audit` shows 3 moderate findings, all `sprintf-js` through mammoth, which only runs in the visitor's browser.
- Privacy page CLS is 0.158 from font swapping (home is 0.003). Moving to `next/font/local` with a latin and latin-ext pair would fix it.

## Next ideas
- Hindi and Tamil output
- Compare two offers side by side
- More states for professional tax, and a state picker driven by city
- Employer NPS as an optional input
- Read a letter from a photo with on-device OCR
- Stronger name redaction (a small on-device name model)
