# Keeping Tabs on Subs

Know what renews, and cancel in time.

A mobile-first subscription tracker, built in 30 days as a personal project. Live preview (invite-only): https://keeping-tabs-on-subs.vercel.app

## The problem

Subscriptions are easy to start and easy to forget. They renew quietly, sometimes after a trial ends or a promo price runs out, and the reminder comes as a receipt after the money has gone. Most trackers fix this with a form to fill in, and a form is exactly what people stop filling in.

## The idea

Adding a subscription should take one capture and one tap, not a form.

1. **Capture.** Type a short description ("Notion Plus, 8 EUR a month, renews on the 15th"), upload a screenshot or PDF of a receipt, or paste the email text.
2. **Review.** An AI model reads the capture and proposes an entry. It never guesses: anything it can't find is left empty, and the app asks a short question for each missing detail. Nothing is added until you approve it. If the capture matches a subscription you already have, it proposes an update instead.
3. **See what's next.** Approved subscriptions appear in one list, sorted by what you need to act on first, with the date you must cancel by to avoid the next charge.
4. **Get reminded.** Alerts arrive 3, 1 and 0 days before the cancel-by date. One tap says "keep it" or "I cancelled it". If the price is about to go up, the same alert says so.

The hypothesis being tested: people keep a tracker current if adding a subscription takes one upload or a short sentence plus one tap to approve.

## What it shows

- **Renewals list:** next renewal and cancel-by date for every subscription, soonest deadline first.
- **Tags:** active trials, entries that need updating (for example a trial that ended), and cancelled subscriptions you still have access to.
- **Running costs:** monthly and yearly totals per currency (EUR and USD are kept separate, never converted).
- **Price rises:** flagged when a promo ends before the next renewal.

## Where it came from

It started as a Google Sheet with formulas for renewal dates, cancel-by dates and price changes. A no-code app on top of the Sheet came next, and was dropped. The Sheet's rules were written down as a spec with tested edge cases (month ends, leap years, trials, plan changes), and this app is the rebuild of that logic.

## Status and roadmap

Built in public over 30 days, October 2026.

| Dates | Milestone |
|---|---|
| Oct 3–9 | Data model, date logic, list, detail, add/edit, invite-only preview |
| Oct 10–14 | Capture (type, upload, paste), AI extraction, review queue with questions |
| Oct 15–17 | Due-soon section, email alerts |
| Oct 18–21 | Test with 2–3 people |
| Oct 22–24 | Fixes, recorded demo |

The current build plan is in `specs/todo/`, and session notes are in `specs/handoffs/`.

## Privacy

- Invite-only: no public sign-up. Each person sees only their own data.
- Database, file storage and hosting are in the EU.
- The demo runs on fictional sample data. The author's real subscriptions never enter the demo, this repository, or any screenshot or video.
- The AI model only sees the one capture it is reading.

## Not in scope (yet)

Reading your inbox, scanning bank or card statements, cancelling on your behalf, push or SMS notifications.

## For developers

Next.js (TypeScript, Tailwind), Supabase (Postgres, auth, storage; EU), Claude API for extraction, Vitest, hosted on Vercel (Frankfurt). Business rules live in `specs/logic-spec.md`; fictional demo data in `specs/seed-data.md`; project rules for AI-assisted development in `CLAUDE.md`.

Requires Node and pnpm.

```bash
pnpm install     # install dependencies
pnpm dev         # run locally at http://localhost:3000
pnpm test        # run unit tests once (pnpm test:watch to watch)
pnpm lint        # lint
pnpm build       # production build
```
