# Keeping Tabs on Subs — Demo Build Brief

Oct 2, 2026 · @Xiao Chen

## Goal and hypothesis

By Oct 24 (Day 30), ship a mobile-friendly demo of Keeping Tabs on Subs where subscriptions arrive by capture, not by typing: type a short description, upload a screenshot or PDF, or paste email text. Every capture lands in a review queue, and approved entries show up in a renewal-sorted list with cancel-by dates.

Hypothesis to test with real users: people will keep a subscription tracker current if adding one takes a single upload or short description plus one tap to approve. Manual entry exists only as a fallback and for corrections.

## Five must-have flows

All five share one subscription record; cancel-by is computed as next renewal minus notice period, never typed.

| # | Flow | What the user does | Fields it needs |
| --- | --- | --- | --- |
| 1 | Renewals list | Opens the app and sees what renews or must be cancelled next, soonest first; "Needs update" rows on top, tags for active trials, an "Ending" group for cancelled-with-access; per-currency monthly and yearly totals (EUR, USD) | Name, current price + currency, billing cycle, next renewal date, cancel-by date, days left, status |
| 2 | Subscription detail | Taps an entry to see everything about it and act on it | All list fields + vendor, plan, renewal price (if different), notice period (days), access-until date (cancelled only), cancel URL, payment method label, source (manual / upload / email), link to original capture, notes |
| 3 | Capture | Types a short description in prose, uploads a screenshot or PDF, or pastes email text | Input type, raw file or text, received-at |
| 4 | Review queue | Approves, edits or rejects each proposed entry; for each missing required field the app asks a short question (tap or type an answer); edit form doubles as manual add | All detail fields pre-filled by extraction, a confidence flag per field, a "looks like existing subscription X" match, status (pending / approved / rejected) |
| 5 | Reminders | Gets alerts 3, 1 and 0 days before cancel-by (per-user list), price rises in the same alert; one tap "Keep" (stops alerts for this renewal) or "Cancelled" | Reminder offsets (days), cancel-by date, next renewal date, kept-for date |

Business rules (renewal dates, cancel-by, flags, reminders, totals) are fixed in `specs/logic-spec.md` (decisions D1–D11 all settled).

Committed for D21–23: email alerts. A daily job emails one alert per row when it reaches an offset (3, 1, 0 days before cancel-by); the email carries the Keep and Cancelled links. In-app alerts come first and work without email.

## Ingestion paths

All capture paths end in the same place: one extraction call, then a proposed entry in the review queue. Nothing reaches the subscription list without the user's approval.

1. **Type, upload or paste.** User types a short description ("Notion Plus, 8 EUR a month, renews on the 15th"), uploads a screenshot or PDF, or pastes email text, in the app. The file goes to private storage, then one LLM API call (Claude, vision for images and PDFs) returns structured JSON in the subscription schema. The result is saved as a proposed entry.

Shared rules for all paths:

- **Missing fields.** Required fields are name, amount, currency, billing cycle and one date (last renewal, next renewal or trial end). For each one that extraction returns as `null`, the app asks a fixed question (cycle: tappable options). The model only parses free-text answers; only the user supplies a missing value, so nothing is guessed. Same flow for every input and for the sparse sample capture.

- Extraction returns `null` for any field it can't find; it never guesses dates or prices.
- If a vendor + amount matches an existing subscription, the proposal is an update, not a new entry.
- The original capture stays linked to the entry, so the user can check what the model read.

## Out of scope

Each item below is a real feature for later, but would not fit into 22 days safely.

- **Forward-to-address email capture** (inbound-email provider, capture domain, webhook). Typed, uploaded and pasted captures cover the same loop.
- **Inbox OAuth for other users (Gmail, O365).** Gmail read access is a restricted scope; a public app needs Google verification and a security assessment. My own Gmail pipeline can keep feeding my private instance.
- **Bank or card statement scanning** (PSD2 aggregators, statement parsing).
- **Automatic cancellation** on the user's behalf. The demo shows the cancel URL and the cancel-by date only.
- **Receipt archiving for taxes.** Captures are stored for review, not organised as a tax archive.
- **Migrating my real Sheet data** into the demo or any deployed instance. The Sheet's logic is ported (field schema, cancel-by math, Gmail extraction rules); its data is not. AppSheet is dropped.
- **Guaranteed notifications** (push, SMS). Reminders are in-app plus email alerts.
- **Multi-tenant polish:** billing, teams, onboarding, account deletion flows.

## Demo mode and data rules

**Decision: private preview, not a local run.** Testers need to reach the app from their own phones, which a local run can't offer.

- Access is invite-only: login required, accounts created by me, no public sign-up.
- Every demo account starts with the seeded sample dataset in `specs/seed-data.md`. Testers get the starter set (4 common fictional subscriptions incl. one price-rise alert, plus 1 pending proposal); my demo account gets the full set (12 subscriptions covering every flag and alert, plus 3 proposals). Dates are computed from the day the account is created.
- Sample captures (screenshots, PDFs, pasted email text) are written for the demo; none come from my real inbox.
- Testers may try their own screenshots or text. They are told this up front, and all tester data is deleted after the test round.
- Data stays in the EU: database, file storage and hosting in an EU region; the LLM call sends only the capture being extracted.
- My real subscriptions and receipts never enter the demo instance or any public copy, screenshot or video.
- Real data is used only as a local dev fixture: a copy of the Sheet imported into a local Supabase (Supabase CLI, Docker), gitignored, never deployed. Interesting real cases are turned into fictional seed rows and tests.

## Stack and milestones

Stack: Next.js (mobile-first web app), Supabase (Postgres, auth, storage, EU region), Claude API for extraction, built end to end with Claude Code. Hosting: one Vercel project, functions in the Frankfurt region, with one hosted Supabase project (free tier) for demo and tester accounts. No second hosted instance. Light multi-user: each tester has their own login and sees only their own data (Supabase row-level security on user\_id).

| Days | Dates | Milestone |
| --- | --- | --- |
| D9–D15 | Oct 3–9 | Schema + seed data, renewals list, detail view, add/edit form, private preview live |
| D16–D20 | Oct 10–14 | Typed description and upload/paste capture, extraction call, review queue, missing-field questions |
| D21–D23 | Oct 15–17 | Due-soon view, email alerts |
| D24–D27 | Oct 18–21 | Test with 2–3 real users, collect issues |
| D28–D30 | Oct 22–24 | Fix at least one tester issue, record demo on sample data |

Cut order if behind: the question UI falls back to highlighted form fields; email alerts stay. Typed description or upload/paste plus the review queue is the minimum demo.
