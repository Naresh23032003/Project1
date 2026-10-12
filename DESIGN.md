# Design

Mode: Operate (the visitor completes a task), with a short Persuade moment on the start screen.

## Direction

A payslip crossed with a bank passbook, explained by a patient older cousin. The result page reads like a statement: ruled lines, dotted leaders, right-aligned tabular amounts, a double rule under the final total. The one memorable element is the ledger that walks CTC down to monthly in-hand. Everything else stays quiet.

Design plan reviewed against the common defaults. Changed: no cream background with serif and terracotta, no dark mode with acid accent, no grid of identical cards, no eyebrow labels, no hero-metric tile. The in-hand number is a sentence ("You'll take home about ₹45,230 a month") with the figure set large inside it, not a stat block.

## Palette (light)

| Token | Value | Use |
|---|---|---|
| paper | #F2F5F3 | page background, a cool grey-green like ledger paper |
| sheet | #FFFFFF | the statement surfaces |
| ink | #14232B | body text |
| ink-soft | #46585F | secondary text |
| rule | #C9D3CF | hairlines and dotted leaders |
| money | #0A6B50 | in-hand figure, primary buttons, links |
| flag-red | #A8201A on #FBE9E7 | red flags |
| flag-amber | #7A4B00 on #FFF1CC | worth-checking flags |

Bar segments: fixed pay #0A6B50, in CTC but not monthly #5B6F8A, depends on conditions #C98A00, one-time #7C5BA6. Each segment is also labelled in text below, so colour is never the only signal.

Dark mode is a deep blue-green slate (#0E181D paper, #15222A sheet, #E7EEEC ink, #4FD1A5 money), chosen for late-evening phone use, not as a mirror of light mode.

## Type

- Headings, the in-hand figure, and buttons: Bricolage Grotesque (variable, weight axis), tabular figures on.
- Body, tables and quotes: Source Sans 3. Its figures are tabular by default.
- Both carry the rupee sign natively. Scale: 15/17 body, 20, 26, 34, and a fluid 40 to 64 for the in-hand figure. Line length under 70 characters. Headings use balanced wrapping.

## Layout

Single column, left aligned, max 42rem, 16px gutters at 360px. One task per screen: start, review, results. Sections are separated by rules and space, not boxes. Flags are rows in a list, not cards. The page uses at most one radius (6px) on controls and none on rules.

```
You'll take home about
₹45,230 a month                [New regime | Old regime]
How we got this number  v
-----------------------------------------------
What's guaranteed and what isn't
[=========== bar ===========]
 Paid to you every month ......... ₹5,66,856  94%
 ...
-----------------------------------------------
Things to look at carefully
 Red flag   Service bond
   "quoted sentence from the letter"
   Why it matters. Ask HR: ...
-----------------------------------------------
Questions to ask HR              [Copy list]
Share card                       [Download image]
```

## Motion

One authored moment: when results appear, the stacked bar segments grow from the left once. Controls answer actions (details open, copy confirms). Everything respects reduced motion.

## States

Empty (start), loading (three honest steps), error (what went wrong and what to do), rate limited, scanned PDF, too long, nothing found. Each has its own copy.

## Accessibility

Visible focus rings in the money colour with a 2px offset, 4.5:1 text contrast, 44px touch targets, a keyboard route for every action (including adding redactions), live region announcements for copy and errors, axe clean.
