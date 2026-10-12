# Launch kit for InHand

Everything below is a draft for you to post from your own accounts. Nothing has been posted anywhere. Fill the blanks in square brackets, and delete any line that isn't true for you.

Replace `[LIVE URL]` with your Vercel link. Then run `node scripts/make-launch-assets.mjs [LIVE URL]` so the screenshots and share card in `launch/` show the real domain instead of localhost.

## Your story (adapt this, don't post it as is)

Write two or three sentences in your own words. A starting shape:

> [WHEN] I got my first offer letter. [WHAT CONFUSED YOU: for example, the CTC, the bond, the notice period]. [WHO YOU ASKED, OR THAT NOBODY WAS AVAILABLE]. I built InHand so the next person doesn't have to guess.

Keep it to things that actually happened. If you have no personal story, skip this part and start with the problem: most freshers sign offers without knowing what lands in their bank account each month.

## LinkedIn post

> Your offer letter says CTC ₹8,40,000. Your bank account will not see ₹70,000 a month.
>
> The gap comes from employer PF, gratuity, variable pay, tax and professional tax. Most freshers never get this explained.
>
> [YOUR STORY IN ONE OR TWO SENTENCES]
>
> I built InHand. You paste or upload your offer letter and it shows:
> - your monthly in-hand pay (new and old tax regime)
> - what's guaranteed and what depends on performance
> - clauses worth asking HR about, with the exact sentence quoted from your letter
> - a list of questions to send HR
>
> Your file never leaves your browser. Names, phone numbers and IDs are removed before anything is sent, and nothing is stored. The salary maths is plain tested code, not an AI guess.
>
> It's free. There's a sample letter if you just want to look: [LIVE URL]
>
> I'd like to hear what it gets wrong. [YOUR NAME]

Suggested hashtags: #freshers #firstjob #offerletter #india

## X thread

1. Your offer says CTC ₹8,40,000. Your bank account won't see ₹70,000 a month. I built a free tool that shows what you'll actually get. [LIVE URL]
2. You paste or upload the letter. It shows monthly in-hand pay under the new and old tax regime, with every step of the calculation visible.
3. It also splits your CTC into what's paid monthly, what's in the CTC but never reaches your account (employer PF, gratuity), and what depends on performance.
4. It flags clauses like service bonds, joining bonus clawbacks and 90 day notice periods. Every flag quotes your letter, so you can see exactly where it came from.
5. Privacy: the file stays in your browser, personal details are removed before anything is sent, nothing is stored. Try the sample letter first. Tell me what's wrong or missing.

## Reddit post (r/developersIndia or similar)

Title: I built a free tool that works out the real monthly in-hand pay from an offer letter. Feedback welcome

> Hi all. [YOUR STORY IN ONE OR TWO SENTENCES, OR DELETE]
>
> I built InHand, a small web tool for freshers reading their first offer. You paste the text of your letter (or upload a PDF or Word file). It shows your monthly in-hand pay, splits the CTC into guaranteed and conditional parts, and points out clauses worth a second look, like bonds, clawbacks and long notice periods. Each flag quotes the sentence from your letter.
>
> How it works, since privacy is the obvious worry: the PDF or Word file is read in your browser and never uploaded. The browser hides names, emails, phone numbers, PAN, Aadhaar-like numbers and addresses, and shows you the exact text before anything is sent. The server asks a language model (Groq) to read that redacted text and return structured data, then forgets it. All the salary and tax maths runs as normal tested code in your browser, so the model never produces a number you see.
>
> It's free and open source: [GITHUB LINK]. There's a sample letter if you don't want to paste your own: [LIVE URL]
>
> Things I know are rough: name redaction is best effort, professional tax for a few states is based on secondary sources, and it only reads English letters. I'd like to know what it gets wrong on your letter. Please check the numbers against your payslip once you have one.

Before posting, read the subreddit's rules on self-promotion. Some require a flair, a weekly thread, or a minimum account age.

## Peerlist

> Launched InHand: a free tool that turns a job offer letter into a plain-English breakdown. Monthly in-hand pay, what's guaranteed, clauses to ask HR about. The file stays in your browser and personal details are removed before anything is sent.
>
> Built with Next.js and TypeScript. The model only extracts. Tax and payroll maths is deterministic code with hand-computed tests. [GITHUB LINK]
>
> Try the sample letter: [LIVE URL]. I'd like feedback on the redaction step especially.

## Product Hunt

**Tagline (38 characters):** See what your offer letter really pays

**Description (under 260 characters):**
Paste or upload your offer letter. See your monthly in-hand pay, what's guaranteed, and clauses to ask HR about, each quoted from your letter. Your file never leaves your browser. Free, no sign-up.

**First comment:**

> Hi, I'm [YOUR NAME]. [YOUR STORY IN ONE OR TWO SENTENCES].
>
> InHand is for people reading a first or second offer in India. It shows monthly in-hand pay for the new and old tax regime, with every step of the calculation open to check. It splits your CTC into paid monthly, in the CTC but not paid monthly, conditional, and one-time money. It also flags things like service bonds and clawbacks and gives you questions to send HR.
>
> Two choices I care about. First, your file is read in your browser and personal details are removed before anything is sent, with a preview you approve. Second, a language model only reads the letter. All the money maths is ordinary code with tests, so it can't invent a number.
>
> There's a sample letter so you can try it in one click. What would you want it to check that it doesn't?

Product Hunt has its own rules on launch timing and asking for upvotes. Read them before you schedule.

## WhatsApp or Telegram message (under 300 characters)

> Got a job offer? Before you sign, paste it into InHand. It shows what you'll actually get in hand each month and flags things like bonds and long notice periods. Free, private, nothing stored. Try the sample first: [LIVE URL]

That is about 225 characters.

## Screen recording script (25 seconds)

Record on a phone, portrait, with the browser in light mode. Keep the sound off and add no music.

1. (0 to 3 s) Open [LIVE URL]. Show the start screen. Let the headline sit for a moment.
2. (3 to 6 s) Tap "Try with a sample". The big in-hand number appears.
3. (6 to 10 s) Tap "Old regime", then "New regime", so the number changes.
4. (10 to 14 s) Tap "How we got this number". Scroll the ledger slowly down to the monthly in-hand line.
5. (14 to 19 s) Scroll to "Things to look at carefully". Pause on the red flag with the quoted sentence.
6. (19 to 23 s) Scroll to "Share your decode". Tap "Download image".
7. (23 to 25 s) End on the start screen with the line about your file staying on your device.

Add a caption overlay at the start: "What will I actually get each month?"

## Screenshots

Generated in `launch/` by `node scripts/make-launch-assets.mjs [LIVE URL]`:

- `1-start.png`: the start screen
- `2-in-hand.png`: the in-hand number with the regime toggle
- `3-calculation.png`: the step-by-step ledger
- `4-flags.png`: the flags with quoted sentences
- `share-card.png`: the image people can share, 1200 by 630

## Ten places to post

Check each community's rules on self-promotion first. Several remove posts that look like ads, and some ban links from new accounts.

1. Your own LinkedIn feed. Ask a few friends and seniors to comment in the first hour.
2. X (your account, and a reply under posts about first jobs or salaries).
3. r/developersIndia. Look for the flair or weekly thread meant for projects.
4. r/personalfinanceindia. The tool is about take-home pay, so frame it that way and don't pitch.
5. r/cscareerquestionsIN. Same advice: lead with the problem.
6. Peerlist, as a launch post.
7. Product Hunt, as a launch. Pick a day when you can reply to comments all day.
8. Show HN on Hacker News. Say plainly that it's built for India and open source.
9. Indie Hackers, in the launch or feedback section.
10. Your college placement cell groups, alumni WhatsApp and Telegram groups, and any placement-prep Discord you're already in. Ask a moderator before posting.

## Launch week plan

**Day 0 (the day before).** Open the live site on your phone and walk through the checklist in the handoff. Regenerate `launch/` against the live URL. Fill every blank above. Ask three friends to try it on their own letters and tell you what broke.

**Day 1.** Post on LinkedIn in the morning and send the WhatsApp message to your own groups. Reply to every comment, including the short ones. Open a GitHub issue for each bug or request that someone gives you, and say so in your reply.

**Day 2.** Post the X thread. Reply to anyone who tries it. Check the Vercel dashboard for errors and the Groq dashboard for usage, and confirm the daily limit is holding.

**Day 3.** Post on r/developersIndia, following their rules. Stay in the thread for a few hours. Fix the most common complaint if it's small, and push the fix.

**Day 4.** Post on Peerlist and Indie Hackers. Share one thing you learned from the feedback so far.

**Day 5.** Post in r/personalfinanceindia and r/cscareerquestionsIN if the rules allow it. Add a short note on what changed since Day 1.

**Day 6.** Launch on Product Hunt, or schedule it for next week if you want more time to prepare. Be present for the whole day.

**Day 7.** Write a short thank-you post with what you changed because of feedback. Go through the issues, label them, and pick the two that matter most for next week. Good candidates: Hindi and Tamil output, comparing two offers side by side, and more states for professional tax.

Throughout the week: reply to every comment, thank people who report errors, and don't argue about tax edge cases. If someone says a number is wrong, ask for their state and the structure of their pay, check it against `src/lib/rules/india.ts`, and fix it with a test if they're right.
