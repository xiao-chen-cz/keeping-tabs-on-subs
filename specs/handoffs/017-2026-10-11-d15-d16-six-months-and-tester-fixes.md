# Session Handoff - 2026-10-11

## Context
Daily challenges D15 (check the test setup in production) and D16 (send tester invitations). On top of that: an "Every 6 months" billing cycle, three small fixes from the production run and tester feedback, and a tester tracker. Covers 2026-10-09 to 2026-10-11.

## Completed
- **Tester guide wording** (`5cca4a2`): the tour covers the list and Settings, replay from ☰.
- **Tester accounts** created on production with the starter set (`pnpm create-account --set starter --out local-data/accounts.jsonl`) for JB (2026-10-09) and RG (2026-10-09). Emails and passwords are only in `local-data/accounts.jsonl`. JB's German invite is a draft in the owner's Gmail (owner sends invites, not Claude).
- **D15 production journey** (`bbb938a`): 23/23 steps passed, written in `docs/test-setup-checklist.md`. Run with `guide-walk@example.com` (reset to starter first) at 390 and 1280 px via `playwright-core` in the session scratchpad. Covered invite, sign-in, tour, `/demo`, typed (EN and DE), pasted and uploaded captures, review questions, approval, list and totals, detail, edit, cancel with proof, Ending, Reopen, Keep/Undo, Keep quietly, Settings, alert job (`alert_sends` rows from today's 07:00 run).
- **Every 6 months cycle** (`76f18ad`, live): enum value `every_6_months` (migration `20261013090000_every_6_months.sql`, applied by the owner with `supabase db push`), `CYCLE_STEP` 6 months, `MONTHLY_FACTOR` 1/6, notice default 7, Keep quietly sends one reminder (new `isLongCycle` in `src/lib/domain/alerts.ts`), extraction prompt ("per half-year", "per semester"), `database.types.ts` hand-edited, alert bundle rebuilt and the `send-alerts` function redeployed by the owner, logic-spec §2.1/§3.3/D5/D13 and edge case E16c, `CLAUDE.md` domain rule. Verified in production: manual add (31 Aug → 28 Feb, cancel-by 21 Feb, totals +€50/month) and a typed capture ("per semester" → Every 6 months).
- **Installments parked** (`13391d1`): `specs/todo/installments-and-intervals.md` describes a term + optional payment schedule with unit+count intervals, after the demo. Until then a yearly contract paid in installments is entered as Yearly with a note.
- **Three fixes** (`7fa8f28`, live, verified in production):
  - Saving Settings redirects to `/?settings=saved` with a "Settings saved." notice (`SettingsSavedNotice`). RG's feedback.
  - The extraction prompt no longer writes remarks about missing fields into Notes.
  - A cancelled row's detail page hides a future charge date; a past one still shows as Last charge.
- **Checklist updated** with the fixes (`7090f87`).
- **Tester tracker** `docs/tester-round.md` (`12c6fb0`, `020f2fe`): initials only (JB, LK, RG), no contact details in the repo.
  - RG tested on 2026-10-09 and gave feedback; the owner sent follow-up questions (incl. biggest improvement), no reply yet.
  - JB and LK plan to test over the weekend of 10–11 Oct.
- 353 tests pass; lint, typecheck and `check:alerts-fn` are green.

## In Progress
- Waiting for tester feedback (JB, LK) and RG's answers to the follow-up questions.
- `specs/handoffs/016-2026-10-09-first-tester-onboarding.md` is untracked; it was written by another session (LK's onboarding). Not committed by this session; the owner decides.

## Next Steps
1. **Commit this handoff** (and 016 if the owner wants it in git).
2. **Mon 12 Oct:** follow up with JB and LK for feedback and nudge RG on her follow-up questions; update `docs/tester-round.md`.
3. Sort incoming feedback into blockers and nice-to-haves; fix blockers, verify each in production, and record it in `docs/test-setup-checklist.md` or a new round-2 list.
4. If a tester drops out by Wed 14 Oct: recruit one more person with consent first, account after they agree.
5. Before reusing `guide-walk@example.com`, reset it (`pnpm reset-account --email guide-walk@example.com --set starter`); it holds the D15 test captures and a "Little Oaks School" 6-monthly entry.
6. Carried over: try a cancel with a pasted confirmation screenshot on the owner's phone; optional `promo_ends` capture check.

## Key Files
- `docs/test-setup-checklist.md` - D15 pass/fail checklist plus the 2026-10-10 fixes
- `docs/tester-round.md` - tester tracker (initials only)
- `specs/todo/installments-and-intervals.md` - parked plan
- `src/lib/domain/types.ts`, `src/lib/domain/alerts.ts` - cycle definitions, `isLongCycle`
- `supabase/migrations/20261013090000_every_6_months.sql`, `supabase/functions/send-alerts/shared.bundle.js`
- `src/lib/extraction/prompt.ts` - cycle list and Notes rule
- `src/app/(app)/settings/actions.ts`, `src/app/(app)/page.tsx`, `src/components/alert-actions.tsx` - Settings save → list notice
- `src/components/subscription-detail.tsx` - charge date on cancelled rows

## Blockers / Notes
- Owner runs `supabase db push` and `supabase functions deploy send-alerts --use-api` with `!`. Order for enum changes: migration, then function deploy, then push the app.
- Changing anything in `src/lib/domain` (even a comment) makes the alert bundle stale (`bundle-fresh.test.ts`) and needs a redeploy; a comment-only change in `compute.ts` was reverted for that reason.
- Testers' personal details never go into tracked files; use initials.
- Tester emails go to Anthropic's model only through captures; testers are told to use made-up data.
