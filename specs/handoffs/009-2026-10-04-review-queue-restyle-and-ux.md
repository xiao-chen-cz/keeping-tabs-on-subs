# Session Handoff - 2026-10-04

## Context
A day of owner-driven iteration on the live app, after the overnight build (handoff 008) and the first production deploy. We built D16–20 Part A (review queue and cancellation record), restyled the UI, and worked through UX feedback from the owner testing on a phone. Everything is on `main` and live at https://keeping-tabs-on-subs.vercel.app, and the working tree is clean.

## Completed
- **Deploy (card D24):** the two `NEXT_PUBLIC_*` vars are in Vercel (Production and Preview, entered by hand). The owner created the demo account (full set) and committed `.env.example`.
- **D12 cancellation record** (`41d63de`): append-only `subscription_events` (date, channel, optional reference, note and confirmation capture). It is in logic-spec, CLAUDE.md and the D16–20 plan.
- **Billing date wording** (`cc39cae`): the single anchor field is labelled "Billing date (last or next charge)" and shown as Next / Last charge. The "plan starts on" hint is gone, and `planStartsLater` was renamed `anchorInFuture`.
- **D16–20 Part A, review queue** (`7767d71`, `c500081`, `c183039`): migration `20261006090000_review_queue.sql`, applied by the owner.
  - **Tables:** captures, proposals, events.
  - **RPCs:** `approve_proposal`, `reject_proposal`, `set_subscription_status`.
  - **Guard trigger:** a signed-in user can change status only through the RPC.
  - **UI:** Review (n), questions for missing fields, approve/reject, a cancel form with history, reopen.
  - **check-rls:** 44+ checks pass.
- **Seed changes** (all fictional, recorded in `seed-data.md`):
  - P1 NoteForge omits the cycle, so testers meet one question.
  - P2 is a $25.00 receipt for CodePilot's last charge, giving a price-change update.
  - A 13th row in the full set, a second CodePilot Pro under `work@example.com`, so USD totals are 50.00 / 600.00.
  - EuroServer is Next +20 (since handoff 008).
- **Restyle** (`aabb95f`):
  - Layout: flat compact rows, pills, a primary/accent palette as tokens in `globals.css`, Poppins and Lora via `next/font`, dark mode.
  - Due soon: its rows no longer repeat under Upcoming.
- **Charge day** (`cad79e4`): a renewal today shows "charged today · next <date>" instead of a red deadline. New computed field `followingRenewal`.
- **Tabs and filters** (`68ca6b3`):
  - Due soon is a tinted box and is never filtered.
  - Category tabs, with an on/off switch stored in the `kts_tabs` cookie.
  - Search and a Scope filter in the URL.
  - Totals follow the filter and name what they cover.
- **Needs update flow** (`bd63027`): `/subscriptions/[id]/complete` asks the same fixed questions for fields that block a renewal. It also offers a "trial ended" shortcut to cancel, with channel Other prefilled. Open questions and fields are marked "Missing" in amber and turn green when answered.
- **Public demo:**
  - `/demo/review` (`445456d`, `de5f505`): a read-only review queue whose questions can be answered. "Approve (demo)" explains instead of saving, and no server action is reachable from demo routes.
  - The login page links to the demo (`46fa46e`).
- **Matching** (`6cd49c6`): matching is by vendor or name with the same currency, no longer the amount.
  - A different amount shows as "Price changed: $20.00 → $25.00".
  - "Add as a separate subscription" detaches the match.
  - The brief, CLAUDE.md and seed-data are updated.
  - The app name is always written in full, "Keeping Tabs on Subs" (rule in CLAUDE.md).
- **Account label** (`ea9c980`, `2bc4f96`): migration `20261007090000_account_label.sql`, applied.
  - The field is optional, a login email or username, never a password.
  - It shows on the detail page, on the cancel page ("Sign in as … to cancel") and in the list only for duplicate names.
  - A different account means no match.
- **Accounts reseeded** after each seed change: the owner's demo account on the full set (13 rows, 3 proposals), testers A and B on starter. `check-rls` passes.
- **Tests:** 268 pass; lint, typecheck and build are green.

## In Progress
- Nothing mid-edit.

## Next Steps
1. **Owner:** try the latest on the phone with the demo account. The account was reset after the account-label change, so all three proposals and both CodePilot rows are there.
2. **Before the first tester (target Oct 9–10):**
   - Create a tester account with `pnpm run create-account --email <tester> --set starter --out local-data/accounts.jsonl`.
   - Review `docs/tester-guide.md` against the current UI. Tabs, filters, the Complete flow and Missing marking are newer than the guide.
   - Write handoff notes on what to observe.
3. **D16–20 Part B (from Oct 10):** capture by typing, upload and paste, plus the extraction call. Decisions B1–B4 in `specs/todo/d16-20-capture-and-review.md` are still open: the model, `ANTHROPIC_API_KEY` on Vercel, the private EU storage bucket and a daily cap. Load the `claude-api` skill for the current model id first. `matchExisting` (with the account rule) must be called when extraction creates a proposal; today only the seed uses it.
4. **D21–23:** Keep/Cancelled one-tap on alerts (`TODO(D21)` in `due-soon.tsx`), the daily alert job and the email provider (EU). The pure logic `alerts.ts` is ready.
5. **Optional:** a "try it" sandbox on `/demo` (changes kept in the browser only) before sharing the link widely; fix the Sheet's H formula so cancelled rows get no renewal (D6, never write below row 2).

## Key Files
- `specs/todo/d16-20-capture-and-review.md`: Part A done, Part B next (decisions B1–B4)
- `specs/todo/d09-15-core-list-and-preview.md` §11: challenge-card coverage table
- `specs/logic-spec.md`: new app decisions in §3.1 (Due soon de-dup, charge-day display, tabs/filters), D2 note (Complete flow), D12
- `specs/seed-data.md`: current answer key (13 rows in the full set, P1–P3 as changed today)
- `supabase/migrations/2026100{5,6,7}090000_*.sql`: core, review queue, account label (all applied)
- `src/lib/domain/`: `proposal.ts`, `questions.ts`, `needs-update.ts`, `filters.ts`, `duplicates.ts`, `cancellation.ts`, `alerts.ts`
- `src/components/`: `review-screen.tsx`, `questions-panel.tsx`, `complete-screen.tsx`, `category-tabs.tsx`, `filter-bar.tsx`, `renewals-list.tsx`
- `src/app/demo/`: the public read-only demo, including `/demo/review`
- `scripts/check-rls.ts`, `create-account.ts`, `reset-account.ts`
- `docs/tester-guide.md`: needs an update before the first tester

## Blockers / Notes
- **Migrations:** Claude's auto mode blocked a retry of `supabase db push` on the hosted DB. The owner runs pushes with `! supabase db push`. Pattern: write the migration, the owner pushes, regenerate types, push the code. Never push code that needs an unapplied migration.
- **Privacy scan before every push:** grep the diff for the owner's real email and domain, the throwaway test password and key prefixes. A match must stop the push. The fictional `hello@readloop.example` caused one false alarm with a loose pattern.
- **No owner details in tracked files:** the owner's demo-account email is kept only in `local-data/` and Supabase. The colour palette comes from the owner's business site and is in the repo as plain values only.
- **Subagents:** Sonnet subagents built each piece; Opus reviewed every diff and checked the UI in Playwright at 320/375 px, in light and dark mode. Several real bugs were caught in that review:
  - a status change without its record;
  - "Last charge" shown on a future date;
  - a misleading "Still missing" hint;
  - a seed receipt that moved CodePilot to today.
- **Playwright artefacts:** screenshots cause a harmless hydration warning about `caret-color`. Old dev-server tabs log HMR websocket errors.
- **Supabase CLI:** v2.116.0, with v2.119.0 available. The free tier pauses after 7 days without activity; check before tester rounds.
