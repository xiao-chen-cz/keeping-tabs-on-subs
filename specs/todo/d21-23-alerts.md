# Plan: D21–23 alerts (Keep / Cancelled, quiet mode, alert channel, email job)

Created 2026-10-05 · **DRAFT, needs owner review before any migration** · Milestone D21–23 (Oct 15–17), parts A and B can be pulled forward · Source of truth: Demo Build Brief (feature 5, "Committed for D21–23"), `specs/logic-spec.md` §3.2, D10, D12–D14, E28–E33 and E38–E48

## 1. What exists and what is missing

Exists: `src/lib/domain/alerts.ts` (`dueAlert`, `alertsToSend`, `dueSoon`), the Due soon section (`src/components/due-soon.tsx`), `profiles.reminder_offsets`, `subscriptions.kept_for_cancel_by`, the cancel sheet and `set_subscription_status` RPC (D12).

Missing, in build order (each part depends on the one before):

- **Part A: Keep and Cancelled actions.** The TODO at `due-soon.tsx:77`. Nothing writes `kept_for_cancel_by` yet.
- **Part B: quiet mode (D13) and alert channel (D14)**, plus a small settings page.
- **Part C: the daily email job**, whose links land on Part A's confirm screen and which honours Part B's settings.

## 2. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| C1 | Where the daily job runs | A **Supabase Edge Function** started by `pg_cron` + `pg_net`, invoked in the Frankfurt region. It reads all users' rows, so it needs the secret key, and the secret key must stay off Vercel (never-cut rule in the D09–15 plan). Inside Supabase the key never leaves the project. Rejected: Vercel Cron (would put the secret key on Vercel); porting the alert rules to SQL (two copies of the logic). |
| C2 | Email provider | **DECIDED 2026-10-05: Brevo** (account created). Only candidate storing data in the EU (OVH France/Germany, Google Cloud Belgium); free tier 300/day. Rejected: Resend (the Ireland region only changes where mail is sent from; account data, metadata and logs stay in the US), Postmark (US only). Still to check: log retention in Brevo's DPA. The email holds subscription name, amount and dates; tester data only, never the owner's real rows. |
| C3 | Sender address | **DECIDED 2026-10-05:** a dedicated sending subdomain `alerts.<domain>` of the owner's business domain, From `Keeping Tabs on Subs <reminders@alerts.<domain>>`. Never the root domain (protects the owner's business mail reputation). Kept separate from a future app hostname (`tabs.<domain>`, a CNAME, which cannot carry Brevo's TXT records). Capture inbox, out of scope, reserved as `in.<domain>`. The real domain lives in `/local-data/private-notes.md` and Edge Function secrets, never in git. |
| C4 | Send time | 07:00 Europe/Berlin (cron at 05:00 UTC, so 06:00 or 07:00 local depending on DST, which is acceptable at day granularity). "Today" per user from `profiles.time_zone` (D8). |
| C5 | Email links | Plain links into the app (`/alerts/<subscription_id>?cb=<cancel-by>&do=keep|cancel`), login required, confirm button on the page. No signed tokens: no write without a user session, and mail scanners that open links change nothing. |
| C6 | Which accounts get email | Every account defaults to `App and email`, including the owner's demo account (full set), so the owner can test emails by hand. The public `/demo` page has no account behind it and never sends email. Emails go to each account's login address, so the demo account's login must be an inbox the owner reads. The throwaway `rls-tester-*@example.com` accounts are set to `App only` (example.com does not receive mail, and bounces hurt the sender's reputation). |

## 3. Schema (one migration, `…_alerts.sql`)

- `create type public.alert_mode as enum ('remind', 'quiet')`; `subscriptions.alert_mode alert_mode not null default 'remind'`; `subscriptions.quiet_offer_shown_at timestamptz` (null = offer not shown yet).
- `create type public.alert_channel as enum ('app', 'app_email')`; `profiles.alert_channel alert_channel not null default 'app_email'`.
- `alter type public.subscription_event_kind add value 'kept'`, plus nullable `subscription_events.cancel_by date`, required by a check when `kind = 'kept'` (`occurred_on` stays "when it happened", i.e. today). The detail-page history shows "Kept for the renewal on 7 Oct".
- RPC `keep_renewal(p_subscription_id, p_cancel_by)`, `security invoker`: sets `kept_for_cancel_by` and inserts the `kept` event in one transaction; fails unless the row is Confirmed; a no-op when already kept for that date (repeat taps from email). Whether `p_cancel_by` is still the row's current Cancel-by is checked in the action, because Cancel-by is computed in TS, not SQL.
- `alert_sends`: `id`, `user_id`, `subscription_id` (composite FK), `cancel_by date`, `alert_offset int`, `sent_at timestamptz default now()`, `email_id text` (provider message id), `unique (subscription_id, cancel_by, alert_offset)`. RLS: users may select their own rows; no insert, update or delete grants for `authenticated` (only the job writes, with the secret key). `check-rls` extended.
- Regenerate `database.types.ts`.

## 4. Part A: Keep and Cancelled

1. Action `keepRenewal(subscriptionId, cancelBy)`: recompute the row for today, refuse with "out of date" when the computed Cancel-by differs (E47), else call `keep_renewal`. Returns whether the Keep offer should show (Remind row, earlier `kept` event exists, `quiet_offer_shown_at` null).
2. Due soon rows get two buttons: **Keep** (immediate, row leaves Due soon with an undo toast) and **Cancelled** (opens the existing cancel sheet with today and, when a cancel URL is known, Website / app pre-selected).
3. Keep offer sheet (E44): "Stop reminding you about <name>? You'll still be alerted to captured price changes and promo endings." Yes → `alert_mode = quiet`; either answer sets `quiet_offer_shown_at`.
4. `/alerts/[id]` confirm page for email links: shows the row, its Cancel-by and the action from `do`, with one confirm button; stale `cb` shows "this reminder is out of date" and the row.
5. `/demo` stays read-only: no buttons.

## 5. Part B: quiet mode and alert channel

1. Pure: extend `reachedOffset` in `alerts.ts` with the D13 rule. Effective offsets for a row = the user's offsets when Remind, trial active or Price rises? = Yes; `[max(offsets)]` for quiet Quarterly / Yearly; `[]` for quiet Monthly / Every 4 weeks. Everything else (Keep, E30 collapse, E31) is unchanged, so `dueAlert`, `alertsToSend` and `dueSoon` follow automatically.
2. Detail page and edit form: "Reminders" with Remind / Keep quietly and the help text from §3.2 (including the known limit). The list shows a quiet mark on quiet rows.
3. `/settings`: alert channel (App only / App and email, showing the login address), reminder offsets (checkboxes 7, 3, 1, 0; at least one). Linked from the header menu.
4. Seed: in the full set, one quiet monthly row with a promo ending soon (so E39 is visible in the demo) and one quiet yearly row; update `specs/seed-data.md` and its expected Due soon list.

## 6. Part C: daily email job

1. `supabase/functions/send-alerts/`: for each user with `alert_channel = 'app_email'`: today in their time zone, load Confirmed rows, compute with the shared domain code, call `alertsToSend` with the offsets already in `alert_sends` for the row's current Cancel-by, collect the hits; if there are none, send nothing; otherwise send **one** email listing them (E46), then insert one `alert_sends` row per hit. A unique-violation on insert means another run got there first: skip.
2. Shared code: the Edge Function imports the pure modules from `src/lib/domain/` (no Node or Next imports there). **Spike first** (30 min): confirm the Supabase bundler accepts imports outside `supabase/functions/`; fallback is a `scripts/sync-domain.ts` copy step checked by a test that the copy is identical.
3. Email content per row: name, amount (or Amount → Renewal amount on a price rise), next renewal, cancel-by, days left, cancel URL if known, and Keep / Cancelled links (C5). Plain HTML plus a text part, app name in full ("Keeping Tabs on Subs"), a footer link to `/settings` to switch email off.
4. Schedule with `pg_cron` (C4); secrets (`SUPABASE_SERVICE_ROLE_KEY` is built in; email API key, app base URL) set as Edge Function secrets, never in git.
5. A manual dry-run mode (`?dry=1`, owner only) that returns what would be sent without sending or recording.

## 7. Tests

- Pure (Vitest): E38–E44 and E48 in `alerts.test.ts`; existing E28–E33 still pass; the job's per-user bundling as a pure function (`buildAlertDigest(rows, offsets, sent, today)`) for E45–E46.
- Actions: `keepRenewal` refuses a stale Cancel-by (E47) and is idempotent.
- RTL: Due soon buttons, the Keep offer appears once, `/alerts/[id]` stale state, settings form.
- RLS: users can read but not write `alert_sends`; `kept` events need `cancel_by`; another user's row cannot be kept.
- Manual: one live run against a tester account with a test address, then check the email on a phone.

## 8. Done when

Keep on a Due soon row removes it until the next renewal and shows in the history; Cancelled records the D12 proof; the second Keep offers quiet mode; a quiet monthly row leaves Due soon unless its price rises; a quiet yearly row alerts once; a tester with email on receives one bundled email at 07:00 whose Keep link works after login, and no second email the same day; switching to App only stops emails.

## 9. Cut order

Committed: in-app Keep / Cancelled and email alerts (the brief keeps email alerts in the cut order). If behind, cut in this order: the Keep offer (users can still set quiet mode on the detail page), the offsets editor in settings (default 3, 1, 0 stays), the dry-run mode. Never cut: the `alert_sends` dedupe, the secret key staying off Vercel, the stale-link check.
