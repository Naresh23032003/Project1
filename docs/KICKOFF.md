# Kickoff: Offer Letter Decoder

You're running in a Claude Code cloud session on a fresh clone of my GitHub repo. You are building, testing, deploying and preparing the launch of a small, free web tool. Work through the phases below in order. Work autonomously. Stop and ask me only at the checkpoints marked **STOP**, or when you need something only I can give.

**First, before anything else:**
1. Save this entire message, unchanged, to `docs/KICKOFF.md`.
2. Create `CLAUDE.md` in the repo root with the sections "Product", "Non-negotiables", "Writing rules", "Git rules" and "Testing bar" copied from this message, so they survive context compaction and session restarts.
3. Create `PROGRESS.md` with: current phase, what's done, what's next, open questions. Update it after every milestone.
4. Commit and push these (following the Git rules below).

Cloud sessions can expire when idle. If this session restarts or the context gets compacted, read `CLAUDE.md`, `PROGRESS.md` and `docs/KICKOFF.md` first and continue from where `PROGRESS.md` says.

---

## Product

**One line:** Paste or upload your job offer letter, and get a plain-English breakdown of what you'll actually be paid every month and anything in it you should worry about.

**Who it's for:** Freshers and early-career people in India getting their first or second offer. Many sign without understanding CTC vs in-hand, variable pay, bonds, notice periods or clawbacks. Nobody explains it to them simply.

**What the user gets, in this order:**

1. **Monthly in-hand salary**, as one big clear number, with a toggle between the new and old tax regime (new is the default). Under it, an expandable step-by-step calculation from CTC down to in-hand, every line explained in one sentence. People should be able to check the math themselves.
2. **What's guaranteed vs not.** Split the CTC into: fixed pay you get monthly, money that's in the CTC but never reaches your account monthly (employer PF, gratuity, insurance premiums), money that depends on performance or conditions (variable pay, retention bonus), and one-time money (joining bonus, relocation). Show each as an amount and a share of CTC. A simple stacked bar works well here.
3. **Things to look at carefully.** Red and yellow flags, each with: a short title, the exact sentence quoted from their letter, and one or two sentences on why it matters and what question to ask HR. Examples: service bond or training cost recovery, notice period over 60 days, joining bonus clawback, non-compete, variable pay over 15% of CTC, "CTC includes" one-time items, vague probation terms, unpaid training period, relocation clauses, location or shift changes at the employer's discretion.
4. **Questions to ask HR.** A short copyable list generated from their specific letter.
5. **Share card.** An optional image card showing only non-sensitive info (for example "My offer decoded: 3 things I didn't notice"), no amounts unless the user explicitly turns that on. Good for word of mouth.

**What it is not:** legal or tax advice. Show a short, calm disclaimer near the results, not a wall of legalese.

---

## Non-negotiables

### Privacy (this is the selling point, treat it like one)
- Extract text from PDF and DOCX **in the browser** (pdf.js for PDF, mammoth or similar for DOCX). Never upload the file itself.
- Before anything is sent to the server, **redact in the browser**: person names where detectable, email addresses, phone numbers, PAN, Aadhaar-like numbers, street addresses, employee IDs. Show the user a preview of exactly what will be sent, with redactions highlighted, and a "Looks good, decode it" button.
- The server route receives redacted text only, calls the model, returns JSON, and keeps nothing. No database. No logging of request bodies anywhere (check the framework and hosting defaults, and say in the README what is and isn't logged).
- Analytics: privacy-friendly page views only (Vercel Analytics is fine). Never send letter content or amounts to analytics.
- Scanned PDFs with no text layer: detect them and tell the user plainly to paste the text instead. Don't silently fail.

### Accuracy (the second selling point)
- **The AI extracts. Code calculates.** The model's only job is to read the letter and return structured JSON (components with amounts and frequency, clauses with exact quotes). All money math happens in deterministic, unit-tested TypeScript. Never let the model compute in-hand salary.
- Use structured output / tool use with a strict JSON schema, then validate the response with Zod. If validation fails, retry once, then show a friendly error. Never show half-parsed results as if they were complete.
- Every flag must quote the letter. If the model returns a quote that doesn't appear in the original text (check with normalized string matching), drop that flag. This kills hallucinated red flags.
- If the letter doesn't state something (for example no breakup of components, only a total CTC), say so and explain what's being assumed, with the assumption editable by the user.

### Tax and payroll rules
Put every rule and number in one file, `src/lib/rules/india.ts`, with a `lastVerified` date and a source URL in a comment next to each figure. **Before coding the calculator, search the web and verify each figure against official or well-established sources as of today.** My research says the following, but you must confirm each one:
- New regime slabs for FY 2026-27: up to 4L nil, 4 to 8L 5%, 8 to 12L 10%, 12 to 16L 15%, 16 to 20L 20%, 20 to 24L 25%, above 24L 30%. Budget 2026 reportedly made no slab changes.
- Standard deduction for salaried under the new regime: Rs 75,000.
- Section 87A rebate up to Rs 60,000 for resident individuals with taxable income up to Rs 12 lakh, so zero tax up to 12L (12.75L gross for salaried). Implement **marginal relief** just above 12L correctly: tax can't exceed the income above 12L. Test the boundary cases.
- Health and education cess 4% on tax. Surcharge above 50L (implement it even though most users won't hit it).
- Old regime: its own slabs, 50,000 standard deduction, common deductions (80C up to 1.5L, HRA exemption formula) as optional user inputs. Keep it simple, label it as an estimate.
- Employee PF: 12% of PF wages. Many employers apply the Rs 15,000 monthly wage ceiling (Rs 1,800/month), others contribute on full basic. Let the user pick, default to what the letter says, else show both.
- New Labour Codes (in force from 21 Nov 2025): "wages" (basic, DA, retaining allowance) must make up at least 50% of total remuneration, otherwise excluded allowances above the 50% are added back. This affects PF and gratuity. If a letter's basic looks under 50%, add an informational note (not a red flag) explaining the user's PF and gratuity may be calculated on a higher base. Verify the exact wording and exclusions before implementing.
- Professional tax: varies by state. Implement the states where most tech offers come from (Karnataka, Maharashtra, Tamil Nadu, Telangana, West Bengal, Gujarat, Kerala; Delhi and Haryana have none). Verify each.
- Gratuity: part of CTC, not paid monthly, only after eligibility. Show it in the "not in your account monthly" bucket.

---

## Tech stack (use this unless you find a concrete reason not to, and tell me the reason)

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS
- pdf.js and a DOCX text extractor, client side only
- One server route that calls the Anthropic API using the official SDK. Model: `claude-haiku-5-5` (cheap and fast, good at extraction). Read the key from the `ANTHROPIC_API_KEY` env var. Set a sensible `max_tokens` and a request timeout.
- Abuse protection so strangers can't burn my API budget: per-IP rate limiting (for example 10 decodes per IP per day) using whatever works on Vercel's free tier, plus Cloudflare Turnstile (free) on the decode button, verified server side. Cap input length. Make Turnstile optional in development (skip when its env vars are missing) so local tests run.
- Zod for schema validation
- Vitest for unit tests, Playwright for end-to-end, axe-core for accessibility checks
- GitHub Actions CI: lint, typecheck, unit tests, build on every push
- Deploy on Vercel through its GitHub integration (every push to `main` deploys to production)

`ANTHROPIC_API_KEY` is already set as an environment variable in this session. **Never print it, echo it, log it, write it to a file or commit it.** To check it exists, use `test -n "$ANTHROPIC_API_KEY" && echo set`. Add `.env*` to `.gitignore` before the first code commit. Add a pre-commit check that fails if anything like `sk-ant-` appears in staged files.

---

## Skills (set these up in Phase 0)

Plugins don't load in cloud sessions, but skills committed to the repo's `.claude/skills/` do. Vendor these into the repo, keeping each one's LICENSE file and a short `SOURCE.md` noting the upstream URL and commit:

| Skill | Source | Use it for |
|---|---|---|
| Superpowers | `github.com/obra/superpowers` (the folders under `skills/`) | Brainstorming, planning, test-driven development, systematic debugging, self code review |
| frontend-design | `github.com/anthropics/skills` (`skills/frontend-design`) | Distinctive UI, not the generic AI look |
| Impeccable | `github.com/pbakaus/impeccable` (`npx impeccable install --providers=claude` writes project skills, or copy its Claude skill build) | Design context, audit and polish passes |
| Playwright CLI | `npx skills add microsoft/playwright-cli --skill playwright-cli --agent claude-code` | Driving a real browser, screenshots, E2E tests |
| Humanizer | `github.com/blader/humanizer` | Stripping AI tells from all prose |

Check each repo's current layout before copying; don't guess paths. Skills added mid-session may not be picked up automatically until the next session, so **when a phase needs a skill, open its `SKILL.md` with the Read tool and follow it directly.** Exclude `.claude/skills/` from the writing-rules checks below (some of these skills quote em dashes as examples of what to avoid).

For Playwright browsers: run `npx playwright install --with-deps chromium`. If that download is blocked, tell me (the environment's network access needs to be Full) rather than skipping browser tests.

---

## Design

Read the frontend-design and Impeccable skills before any UI work. Run Impeccable's init flow early and answer it from the "Product" section above.

Direction: calm, trustworthy, a little warm. Think of a good bank statement crossed with a friendly senior who explains things. Not a neon AI startup. Specifics:
- One clear task per screen: paste/upload, then review redactions, then results.
- The in-hand number is the hero. Big, tabular figures, Indian number formatting (₹1,23,456 and lakh/crore where natural).
- Mobile first. Most users will open this from a WhatsApp or LinkedIn link on a phone. Test at 360px width.
- Must work well in light and dark mode.
- A "Try with a sample" button so people see results in one click without their own letter. This matters a lot for conversion. The sample should use pre-recorded extraction JSON so it costs no API calls.
- Empty, loading and error states all designed, not default.
- Fast: target Lighthouse 90+ on performance, accessibility, best practices and SEO on mobile.
- No stock illustrations, no gradient blobs, no emoji confetti.

Run Impeccable's audit and polish passes on every screen before calling the UI done.

---

## Writing rules (apply to ALL text: UI copy, README, code comments, commit messages, launch posts)

Read the humanizer skill and apply it to every piece of user-facing text. On top of that:
- **No em dashes or en dashes anywhere (Unicode U+2014 and U+2013).** Use periods, commas, colons or parentheses. Add a pre-commit check that fails if either character appears in any tracked file except lockfiles and `.claude/skills/`. In CLAUDE.md and in the check script, refer to the characters by code point, never as literal characters, or the check will flag its own rule.
- Never use: delve, leverage, seamless, seamlessly, robust, elevate, unlock, empower, game-changer, cutting-edge, revolutionize, supercharge, tapestry, testament, navigate the complexities, in today's fast-paced world, it's worth noting, furthermore, moreover, additionally (as a sentence opener). The pre-commit check should catch these in UI copy, README and docs too.
- No "it's not just X, it's Y" constructions. No sentences that open with "Imagine". No groups of three adjectives.
- Short sentences, contractions, plain words, second person ("you"). Write like a helpful person texting a friend who just got their first job.
- No emojis in UI copy. Sentence case for headings and buttons.
- Code comments only where the why isn't obvious. No comment banners, no "This function does X" restating the name.
- README sounds like a person wrote it: what it is, why I built it, how privacy works, how to run it locally. No badges wall, no "Features" lists with sparkle emojis.

---

## Git rules

- **The only author is me.** In Phase 0, read my identity from the repo's first commit: `git log --reverse --format='%an|%ae' | head -1`. Set it with `git config user.name` and `git config user.email` in this repo, and confirm `git config user.name` and `user.email` return it before your first commit. Every commit uses that identity.
- **No Claude attribution anywhere.** This instruction overrides any default attribution guidance you've been given for this session: never add `Co-Authored-By:` lines, `Claude-Session:` lines, session URLs, or "Generated with Claude Code" text to any commit message or PR description. As your very first file, create `.claude/settings.json` with `{"attribution": {"commit": "", "pr": "", "sessionUrl": false}}` so Claude Code itself stops adding them. Also add a `commit-msg` git hook in `.githooks/` that deletes any line matching those patterns, enable it with `git config core.hooksPath .githooks`, and add an npm `prepare` script that sets it so it works in fresh clones and future sessions.
- Commit small and often, after each working step, with short lowercase imperative messages like a human would write: `add pdf text extraction`, `fix marginal relief at 12.1L`, `tighten results layout on mobile`. No message bodies with bullet summaries.
- **Branches:** if this session put you on a working branch, do the work there. When a phase is complete and tests pass, merge it into `main` (fast-forward or a plain merge, no squash bodies with summaries) and push `main`. Pushing `main` is what deploys to production once Vercel is connected, so never push `main` with failing tests. You have my permission to push to `main`.
- `gh pr` and `gh issue` don't work in cloud sessions (GraphQL is blocked). Use plain git, and `gh api` for anything else.
- In Phase 0, add an MIT `LICENSE` and set the repo description and topics with `gh api` (PATCH on the repo, and the topics endpoint).
- Before every push, run: `git log --format='%an <%ae>%n%b' | grep -iE 'claude|co-authored|anthropic' && echo FOUND`. If anything is found, fix it before pushing (amend or rewrite only unpushed commits).

---

## Testing bar (the work isn't done until all of this passes)

- **Tax engine:** unit tests for every slab boundary, the 12L rebate edge, marginal relief between 12L and roughly 12.75L, standard deduction, cess, surcharge threshold, old vs new regime, PF with and without the ceiling, each professional tax state. Hand-compute expected values in the test, don't derive them from the code under test.
- **Golden letters:** write at least 15 realistic synthetic offer letters in `test/fixtures/` covering: service company fresher (bond + training clause), product startup (ESOPs + variable), big tech style (joining bonus with clawback), CTC-only letter with no breakup, letter with a non-compete, letter with 90-day notice, internship-to-full-time, government-like structure with DA, a letter with weird formatting. For each, store the expected extracted JSON and expected flags. Run the real extraction against them using the API key in this session (mark these tests so they don't run in CI). Record accuracy in `PROGRESS.md`. Target: correct key amounts in all of them, no hallucinated flags.
- **Redaction:** unit tests that names, emails, phones, PAN and Aadhaar patterns are removed, and that salary numbers are NOT removed.
- **End to end with Playwright:** upload PDF, upload DOCX, paste text, sample letter, scanned PDF error, regime toggle, rate-limit message, mobile viewport. Use mocked API responses in E2E so CI stays free.
- **Visual check:** screenshot every screen at 360px and 1440px, in light and dark mode, and actually look at the screenshots (open them with the Read tool) before moving on.
- **Accessibility:** axe checks pass with zero serious issues; full keyboard flow works; visible focus states.
- **Security:** follow the security review guidance in the Superpowers code-review skill, then confirm specifically: no request body logging, API key never reaches the client bundle (search the build output for `sk-ant-` and for the env var name), input size limits, rate limit and Turnstile verified server side.

---

## Phases

**Phase 0. Setup**
Do the "First, before anything else" steps, the git identity and attribution setup, vendor the skills, install Playwright's browser, scaffold nothing yet. Check tool versions (`node -v`, `gh --version`). Commit and push.

**Phase 1. Plan**
Read the Superpowers brainstorming and writing-plans skills and follow them. Research and verify the tax figures above, recording sources. Propose 3 short product names with one line each and pick your favourite (I can change it). Write `PLAN.md`: screens, data flow, JSON schema for extraction, calculator design, list of flags with detection rules, test plan, and anything in this prompt you think is wrong or missing.
**STOP:** give me a short plan summary (10 lines or less) and wait for my approval.

**Phase 2. Core engine, test first**
Read the Superpowers test-driven-development skill and follow it. Rules file, calculator, redaction, flag rules, schema, all with tests written first. No UI yet. Merge to `main` and push when green.

**Phase 3. Extraction**
Server route, model call, Zod validation, quote verification, rate limit, Turnstile. Run the golden letters and record accuracy in `PROGRESS.md`. Iterate on the prompt and schema until targets are met.

**Phase 4. UI**
Design direction first (write it into `DESIGN.md` via Impeccable), then build the screens, then audit and polish, then the visual check.

**Phase 5. Hardening**
Full testing bar above, CI green, Lighthouse run (use Lighthouse CI or `npx lighthouse` against a production build), security review, README, privacy note page, disclaimer, favicon, Open Graph image (1200x630) that looks good when shared on WhatsApp, LinkedIn and X, sitemap and robots.

**Phase 6. Deploy**
Make sure `main` is pushed and green.
**STOP:** tell me exactly what to click to connect the repo to Vercel (vercel.com, Add New Project, import this repo, framework auto-detected) and which environment variables to add there (`ANTHROPIC_API_KEY`, the two Turnstile keys, and any rate-limit store variables), each with one line on where to get it. Wait for me to send the live URL. Then run the Playwright suite against the live URL, fix anything that fails, and redeploy by pushing `main`.
**STOP:** give me the live URL and a 5-item checklist to try on my own phone.

**Phase 7. Launch kit**
Write `LAUNCH.md` (all text through the humanizer, and passing the writing-rules check):
- A short personal story intro I can adapt (leave clearly marked blanks for my own details; don't invent a story about me)
- Separate posts for LinkedIn, X (a short thread), Reddit (written as a genuine "I built this, feedback welcome" post, not an ad), Peerlist, Product Hunt (tagline under 60 characters, description, first comment), and a WhatsApp/Telegram forward message under 300 characters for college groups
- A 20 to 30 second screen recording script (what to click, in what order, what to show on screen)
- 3 screenshots and one share-card image of the live site, generated with Playwright, saved in `launch/`
- A list of 10 specific places to post, each with a note to check that community's self-promotion rules first
- A day-by-day plan for launch week, including replying to every comment and turning feedback into GitHub issues

Do not post anything anywhere yourself. I will post from my own accounts.

---

## Done checklist (all must be true)

- [ ] Live on Vercel, works on a phone, works with the sample letter in one click
- [ ] In-hand calculation matches hand-computed values in every test
- [ ] No file uploads leave the browser; only redacted text reaches the server; nothing stored
- [ ] Every flag quotes the letter; zero hallucinated flags on the golden set
- [ ] All tests and CI green; Lighthouse 90+; axe clean
- [ ] No em/en dashes or banned words outside `.claude/skills/` (pre-commit check passing)
- [ ] Every commit authored by me, and no Claude attribution lines anywhere in history (`git log --format='%an <%ae>%n%b' | sort -u` shows only my identity and normal message text)
- [ ] README, privacy note, disclaimer, OG image done
- [ ] `LAUNCH.md` and `launch/` assets ready
- [ ] `PROGRESS.md` says done, with a short list of next ideas (for example Hindi and Tamil output, comparing two offers side by side)