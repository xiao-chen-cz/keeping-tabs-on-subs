@AGENTS.md

# Keeping Tabs on Subs

Mobile-first subscription tracker. Pain point: forgetting subscriptions until they renew, sometimes at a higher price. Owner: Xiao Chen. Built for personal use first, possibly for others later.

**Goal:** by 2026-10-24 ship a private, invite-only demo where subscriptions arrive by capture (type a short description, upload a screenshot/PDF, or paste email text), land in a review queue, and approved entries show in a renewal-sorted list with cancel-by dates. Manual entry is only a fallback and for corrections. Brief: `Keeping Tabs on Subs — Demo Build Brief.md` (authoritative for scope and milestones).

## Stack
Next.js (TypeScript strict, Tailwind, mobile-first), Supabase (Postgres, auth, storage, EU region, RLS on `user_id`), Claude API for extraction (vision for images/PDFs), One Vercel project (Frankfurt functions) and one hosted Supabase project for demo and tester accounts. Vitest, pnpm.

## Source of truth
- `specs/logic-spec.md`: data model, computed fields, edge cases E1–E27, open decisions D1–D11. Port this logic; keep it in sync when behaviour changes.
- `specs/seed-data.md`: fictional demo data (dates as offsets from today), two sets: starter (4 subscriptions + 1 proposal, for testers) and full (12 + 3, for the demo account and tests), with expected totals/alerts.
- `specs/handoffs/`: session history (`/EA-handoff`, `/EA-pickup`).
- The owner's private Google Sheet (ID in `/local-data/private-notes.md`, not in git) holds the owner's real data and feeds the private instance. Its logic is ported, its data is not. AppSheet is abandoned.

## Domain rules (non-negotiable)
- Computed, never stored or typed: next renewal, days until renewal, cancel-by, days until cancel-by, renewal amount, price-rises flag. Implement as a DB view or pure functions.
- Next renewal = first renewal date on or after today (D1). A renewal today shows 0 days. Month addition clamps to month end and counts from the original anchor date (31 Jan → 28 Feb → 31 Mar).
- Cancel-by = next renewal − notice days. Notice defaults to 3 days for Monthly / Every 4 weeks, 7 otherwise; nullable `cancel_notice_days` overrides it (D5).
- Reminders (D10): alerts at 3, 1, 0 days before cancel-by (per-user list), once per renewal. One tap Keep (silences this renewal only) or Cancelled. Price rises ride in the same alert. Tags: Trial (active trial) and Needs update (no next renewal; sorted to the top) are computed, never stored (D2, D3).
- Promo: Regular price applies at the first renewal on or after Promo ends. Only the next renewal is computed.
- No currency conversion; totals are per currency (EUR and USD separately, monthly and yearly, excluding cancelled and active trials; D7).
- Cancelled rows have no renewals or alerts; optional `access_until` date shows them in an "Ending" group (D6). "Today" is the user's local date, default Europe/Berlin (D8).
- Pure date logic takes an injected "today". Tests cover every edge case in logic-spec §5. Fix the time zone for "today" (D8).
- Enums/check constraints: Scope (Business, Personal, Family), Confidence (High, Medium, Low), Currency, Billing cycle, subscription Status. Category and Payment method are lookup tables.
- Two different statuses: subscription status (Confirmed / Cancelled) vs capture status (pending / approved / rejected).

## Ingestion and extraction
- All paths (type, upload, paste) end in one extraction call, then a proposed entry in the review queue. Nothing reaches the list without user approval.
- Missing required fields (name, amount, currency, cycle, one date) get fixed questions in the review flow, from code; the model only parses free-text answers. Only the user supplies a missing value.
- Extraction returns `null` for anything not found; never guess dates or prices. Per-field confidence flag.
- Vendor + amount matching an existing subscription proposes an update, not a new entry.
- Original capture stays linked to the entry.
- Extraction rules (logic-spec §4): only fill Category/Scope/Confidence when empty, only from fixed lists; Scope evidence rules; Confidence is the lower of Category and Scope; Regular price/Promo ends only when the source states both; payment method as nickname only, never card or account numbers.

## Data and privacy
- Invite-only: no public sign-up, accounts created by the owner. Each account is seeded from `specs/seed-data.md` (fictional only); sample captures are written for the demo.
- Real data lives only in a local, gitignored Supabase/dev DB imported from the Sheet, as a dev fixture. Never deploy it, commit it or show it.
- The repo is meant to be public. Tracked files (code, specs, handoffs, commit messages) never contain the owner's real subscription names, prices, dates, account nicknames, the Sheet ID, or the owner's email address and business domain; use the fictional seed names. Private notes go to `/local-data/` (gitignored).
- EU only for database, storage and hosting; the LLM call sends only the capture being extracted.
- The owner's real subscriptions and receipts never enter the demo instance or any public copy, screenshot or video. Tester data is deleted after the test round.

## Out of scope (do not build)
Inbox OAuth (Gmail/O365) for other users, forward-to-address email capture, bank/card scanning, automatic cancellation (show cancel URL and cancel-by only), tax receipt archive, migrating real Sheet data, push/SMS, billing/teams/onboarding/account deletion. Reminders are in-app plus email alerts.

## Milestones and cut order
D9–15 (Oct 3–9) schema, seed, list, detail, add/edit, preview live · D16–20 typed description + upload/paste, extraction, review queue, missing-field questions · D21–23 due-soon view, email alerts · D24–27 tests with 2–3 users · D28–30 fix, record demo on sample data. If behind, the question UI falls back to highlighted form fields; email alerts stay. Minimum demo: typed description or upload/paste plus review queue with questions.

## Working notes
- Never write to H, I, K, L, U, V below row 2 in the Sheet (#REF!). The Sheets tools can't set protection or validation.
- Project folder is being turned into a git repo; app code lives at the root next to `specs/`.
- Open: inbound-email provider (EU residency, free tier), capture domain (subdomain of the owner's business domain, or separate).
