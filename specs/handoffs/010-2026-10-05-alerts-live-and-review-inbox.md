# Session Handoff - 2026-10-05

## Context
Day D11. The challenge card (pure functions and tests for cancel-by, alert thresholds, price rise at next renewal) was already met by earlier work, so we pulled the D21–23 reminders milestone forward and shipped it end to end: Keep / Cancelled in the app, quiet mode, settings, and a live daily email job. Then UX fixes from the owner testing on desktop and phone. Everything is on `main`, deployed, and the working tree is clean.

## Completed
- **D11 confirmed:** E8/E9 (4-week), notice override 30, E11–E14 (trial), E19/E20 (future promo does not raise the next renewal), E21 (promo ends on renewal). 268 tests passed at the start.
- **Spec** (`0f10ed8`): logic-spec §3.2 rewritten; **D13 Keep quietly** (per subscription: no routine alerts for monthly / 4-weekly, one at the largest offset for quarterly / yearly, price rises and trials always alert), **D14 alert channel** (app only / app and email, default email on), at most one email per user per day and none when nothing is due, safe email links, edge cases **E38–E48** (plus E46b). Plan `specs/todo/d21-23-alerts.md` (parts A–C, decisions C1–C6).
- **Part A** (`82b940e`, `76677d5`): Keep and Cancelled under each Due soon row; Keep refuses a stale cancel-by (E47); after a second Keep a one-time "Keep quietly?" offer (E44); Cancelled opens the D12 cancel sheet pre-filled (`?reason=alert`). **Undo** (owner request): Undo on the Kept notice, "Remind me again" on the detail page, Undo on the quiet notice; logged as `keep_undone`, not counted for the offer. `/alerts/[id]` is the landing page for email links and never changes data on open.
- **Part B** (`cadc3e7`): `effectiveOffsets` / `describeReminders` in `alerts.ts`; Reminders setting on the detail page (not in the edit form); "Quiet" tag in list, Due soon and header; `/settings` (channel + offsets 7/3/1/0, at least one). Full seed: Cloudly Storage (quiet monthly) and BudgetBuddy (quiet yearly) on Keep quietly; starter unchanged.
- **Part C** (`122fed1` … `8da58aa`): pure `src/lib/alerts-job/digest.ts` (`buildDigest`, `renderDigestEmail`, HTML-escaped, only http(s) links); Edge Function `supabase/functions/send-alerts` uses it via `shared.bundle.js` (`pnpm bundle:alerts`, `deno bundle`; a Vitest test fails on a stale bundle; `pnpm check:alerts-fn` runs `deno check`). Claim-before-send in `alert_sends`, release on Brevo failure. pg_cron `send-alerts-daily` at 05:00 UTC posts with `x-cron-secret` and `x-region: eu-central-1`; URL and secret from Vault. **Live and verified:** real email delivered (Sent/Delivered/Clicked in Brevo), rerun sends 0, wrong secret 401, cron SQL → 200.
- **Email provider:** Brevo (EU data; Resend and Postmark store in the US). Sending subdomain `alerts.<domain>` with DKIM + DMARC added manually at the DNS host; From "Keeping Tabs on Subs". Brevo IP blocking off (Edge Functions have no fixed IPs). Log retention 1 month (shortest). Open/click tracking cannot be switched off on the free plan: recorded as a known limitation.
- **Migrations applied:** `20261008090000_alerts.sql`, `20261009090000_undo_keep.sql`, `20261010090000_alerts_cron.sql`. Types regenerated. `check-rls`: 55/55.
- **Accounts:** owner's demo account reset to the new full set (13 subs, 3 proposals; this also reset its review queue). Both `rls-tester-*@example.com` accounts set to app only (C6).
- **UX from owner testing** (`549658c`, `2ef53ac`): the review queue is now a calm inbox row under Due soon ("3 new entries to check · Not in your list yet") instead of a primary "Review (3)" bar that read as part of Due soon; Due soon has the subtitle "Decide before the cancel-by date. If you do nothing, they renew."; category pills wrap (smaller, no sideways scroll) with the Tabs switch as the last item; app and demo widened from 576px to 768px. Banner and `docs/tester-guide.md` updated (new step 5 on reminders).
- **Tests:** 310 pass; lint, typecheck, build green.

## In Progress
- Nothing mid-edit.

## Next Steps
1. **Tomorrow ~07:00 Berlin:** the first automatic run should email the owner's demo account the 1-day reminders (The Daily Ledger and VoiceDraft Pro, unless kept). Verify in the inbox and with `supabase db query --linked "select status_code, content from net._http_response order by id desc limit 3;"` and `select * from cron.job_run_details order by start_time desc limit 3;`.
2. **D16–20 Part B (capture + extraction):** decisions B1–B4 in `specs/todo/d16-20-capture-and-review.md` still open (model via the `claude-api` skill, `ANTHROPIC_API_KEY` on Vercel, private EU storage bucket, daily cap). `matchExisting` must run when extraction creates a proposal.
3. **Before the first tester (target Oct 9–10):** create the tester account (`pnpm create-account --email <tester> --set starter --out local-data/accounts.jsonl`; email alerts default on, which is wanted for real testers), walk `docs/tester-guide.md` against the UI.
4. **Optional:** a category whose only rows sit in Due soon has no tab, and filtering by it says "Nothing matches" (e.g. Finance / Banking on the demo); consider counting Due soon rows in tab counts. Brevo support ticket to disable tracking. Raise the four `alerts` DNS records' TTL from 300 to 3600 now that mail works.

## Key Files
- `specs/todo/d21-23-alerts.md` - alerts plan, decisions C1–C6, what was built per part
- `specs/logic-spec.md` - §3.2 reminders, D10 amendment, D13, D14, E38–E48
- `src/lib/domain/alerts.ts` - alert rules (`effectiveOffsets`, `checkKeep`, `shouldOfferQuiet`, `describeReminders`)
- `src/lib/alerts-job/digest.ts` - which rows go into today's email, and the email itself
- `supabase/functions/send-alerts/index.ts` (+ `shared.bundle.js`, generated) - the daily job
- `scripts/bundle-alerts.sh`, `scripts/alerts-bundle-entry.ts`, `scripts/alerts-bundle.deno.json` - bundling
- `supabase/migrations/202610{08,09,10}090000_*.sql` - alerts schema, undo, cron
- `src/app/(app)/alerts/` - Keep / undo / quiet actions and the email landing page
- `src/app/(app)/settings/`, `src/components/settings-form.tsx` - settings
- `src/components/alert-actions.tsx`, `review-inbox.tsx`, `category-tabs.tsx` - new UI pieces
- `local-data/alerts-function.env`, `local-data/alerts-vault.sql`, `local-data/private-notes.md` - secrets and real domain (gitignored, never commit)

## Blockers / Notes
- **After changing anything the bundle includes** (`src/lib/domain`, `src/lib/alerts-job`, `src/lib/dates`, `src/components/format.ts`, `src/lib/dal/map-row.ts`): run `pnpm bundle:alerts`, commit, then `! supabase functions deploy send-alerts --use-api`. Requires Deno (installed via Homebrew).
- **Secrets:** Edge Function secrets `BREVO_API_KEY`, `CRON_SECRET`, `APP_URL`, `ALERTS_FROM_EMAIL`; Vault `project_url`, `alerts_cron_secret`. Never in git or chat. The Brevo key has full account access: rotate if in doubt.
- **Resets wipe the review queue too:** `reset-account` recreates subscriptions, captures and proposals. Say so explicitly before running it on the owner's account (caused confusion today).
- **Owner runs** `supabase db push` and `supabase functions deploy` with `!`; Claude can run read-only `supabase db query --linked`.
- **Vercel Hobby logs** only cover about the last hour (`vercel logs --environment production --since 1h --no-branch`).
- **Supabase free tier** pauses after 7 days without activity; the daily cron call should now keep it active, but check before tester rounds.
- **Playwright screenshots** land in the repo root when saved with a relative path; move them out before committing.
- Totals: 4-weekly counts 13 charges a year (× 13/12 per month); totals use the current amount, not the coming price.
