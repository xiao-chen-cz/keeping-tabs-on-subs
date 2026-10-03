# Keeping Tabs on Subs: Demo Build Brief (D08)

**Goal (Day 30, Oct 24):** a mobile-friendly demo where subscriptions arrive by capture, not typing. Type a short description, upload a screenshot or PDF, or paste email text; each capture lands in a review queue, and approved entries appear in a renewal-sorted list with cancel-by dates. **Hypothesis:** people keep a tracker current if adding a subscription takes one upload or short description plus one tap to approve.

## Five must-have flows
All five share one subscription record. Cancel-by is computed (next renewal minus notice period), never typed.

| # | Flow | Fields it needs |
|---|---|---|
| 1 | **Renewals list**: what renews or must be cancelled next, soonest first; filter by status; totals per currency | Name, price + currency, billing cycle, next renewal, cancel-by, days left, status |
| 2 | **Subscription detail**: everything about one entry, plus its original capture | All list fields + vendor, plan, renewal price, notice days, cancel URL, payment method label, source, notes |
| 3 | **Capture**: type a short description, upload screenshot/PDF, or paste text | Input type, file or text, received-at |
| 4 | **Review queue**: approve, edit or reject each proposed entry; a short question for every missing required field; the edit form doubles as manual add | Detail fields pre-filled by extraction, confidence per field, "matches existing subscription" hint, status (pending / approved / rejected) |
| 5 | **Reminders**: alerts 3, 1 and 0 days before cancel-by; one tap Keep or Cancelled | Reminder offsets, cancel-by, next renewal, kept-for date |

## Explicitly out of scope
- Gmail/O365 inbox access for other users (restricted scopes need verification); forward-to-address email capture
- Bank or card statement scanning
- Automatic cancellation (the demo shows the cancel URL and date only)
- Tax receipt archive
- Importing my real data into the demo
- Push or SMS notifications (reminders are in-app plus email alerts)
- Billing, teams, onboarding, account deletion

## Demo choice: private preview, not a local run
Testers must reach the app from their own phones, which a local run can't offer. The preview is invite-only: login required, accounts created by me, no public sign-up. Stack: Next.js, Supabase (EU), Claude API for extraction, hosted on Vercel (Frankfurt).

## Keeping real data out
- Tester accounts start with 4 fictional subscriptions and 1 proposal to approve; my demo account has a fuller set of 12. All sample captures are written for the demo.
- My real subscriptions and receipts never enter the demo instance or any public copy, screenshot or video.
- Testers can use their own screenshots, are told up front, and their data is deleted after the test round.
- Each user sees only their own data (row-level security); database, storage and hosting stay in the EU.

## Milestones
D9–15 schema, seed, list, detail, add/edit, preview live · D16–20 typed description and upload/paste capture, extraction, review queue with missing-field questions · D21–23 due-soon view, email alerts · D24–27 test with 2–3 users · D28–30 fix, record demo. If behind, the question UI falls back to highlighted form fields; email alerts stay.
