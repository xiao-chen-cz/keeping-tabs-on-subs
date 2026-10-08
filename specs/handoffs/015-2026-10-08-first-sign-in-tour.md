# Session Handoff - 2026-10-08

## Context
Added a click-through tour for testers signing in for the first time: highlights the main features with short commentary. The owner chose to always show it (option c: the test round measures the toured experience, not first-glance discoverability).

## Completed
- **Handoff 014** committed and pushed (`9aa87fb`).
- **Migration `20261012090000_tour.sql`** (`profiles.tour_done_at timestamptz`, nullable) applied to the hosted project with owner approval. `database.types.ts` was hand-edited to match (no Docker, so the generator could not run).
- **Tour** (`6044a07`, pushed, deployed): own component, no library. Seven stops:
  - List (`/`): first row with a cancel-by ahead (`first-row`), Due soon (`due-soon`), review inbox (`inbox`), + New (`new`).
  - Settings (`/settings`): `alert-channel` (email or app only), `reminder-days`, `quiet-note` (Keep quietly, always with a sample of the detail page's Reminders choice).
  - A list stop whose element is missing (nothing due, nothing to check, no row with a cancel-by) shows a fictional "Example" card in the tour card instead of being skipped (owner's request).
  - The page is dimmed and blocked; the highlight ring scrolls into view; the card sits at the bottom, or the top when the highlight is low. Back/Next/Skip, Esc, focus on the main button, reduced motion respected.
  - Moving between pages uses `?tour=<target>`; `?tour=1` opens the welcome card. Shown on the list when `tour_done_at` is null or `?tour` is present; on Settings only with `?tour`.
  - Marked as seen on Show me, Skip, Esc or Done (`markTourDone`, only sets the time when null). `?tour` is dropped from the URL on close.
  - `reset-account` clears `tour_done_at`; the tester guide mentions the tour.
- **Replay** (`3537af7`, pushed, deployed): "Replay tour" in the ☰ menu plus a "Replay the tour" link on Settings. Fixed a replay that did nothing after the tour had been closed on the same page (`AppTour` remounts when `?tour` reappears, via `useSearchParams`).
- Checked in a real browser (local dev, test account `guide-walk@example.com`, starter set): full flow at 390 px and 1280 px, the example cards (markers stripped in the browser), persistence, and repeated replays. 348 tests pass; lint and typecheck green.

## In Progress
- Nothing uncommitted except this handoff.

## Next Steps
1. **Commit and push this handoff** (after owner OK).
2. Owner: try ☰ → Replay tour on production (the owner's account is already marked as seen; on request, clear `tour_done_at` for that account to see the first-sign-in behaviour).
3. Create tester accounts when the owner sends the emails (`pnpm create-account --email <tester> --set starter --out local-data/accounts.jsonl`); they get the tour automatically.
4. Carried over from 014:
   - try a cancel with a pasted confirmation screenshot on production;
   - check the form layout signed in (Add/Edit);
   - optional `promo_ends` capture check;
   - watch tester feedback (capture wait, phone photos, + New / ☰, form length, email-forwarding requests).
5. Watch whether testers skip the tour or find it too long; the stop texts and examples are at the top of `src/components/tour.tsx`.
6. German/English is parked until after the demo (`specs/todo/i18n-de-en.md`, est. 4–5 days); testers are fine in English.

## Key Files
- `src/components/tour.tsx` - `APP_TOUR` stops and examples, generic `Tour`, `AppTour` wrapper (pathname, router, `?tour` handling)
- `src/components/tour.test.tsx` - tour behaviour, plus a check that no list stop can be skipped
- `src/app/(app)/tour-actions.ts` - `markTourDoneAction`
- `src/lib/dal/profile.ts` - `tourDone` on the profile, `markTourDone()`
- `src/app/(app)/page.tsx`, `src/app/(app)/settings/page.tsx` - where the tour renders
- `src/components/renewals-list.tsx`, `due-soon.tsx`, `review-inbox.tsx`, `settings-form.tsx`, `src/app/(app)/layout.tsx` - `data-tour` markers
- `src/components/header-menu.tsx` - Replay tour item
- `supabase/migrations/20261012090000_tour.sql`, `scripts/reset-account.ts`, `docs/tester-guide.md`

## Blockers / Notes
- The local dev server uses the hosted Supabase project (no Docker), so closing the tour locally marks it as seen on production too. That is how the owner's account was marked.
- The Playwright MCP browser was busy again. Browser checks used `playwright-core` installed in the session scratchpad, driving the installed Google Chrome (`channel: "chrome"`). It renders 390 px fine, unlike `--headless=new --screenshot`.
- In dev, the Next.js dev-tools button is also named "Next…"; use `exact: true` when selecting the tour's Next button.
- A hydration warning appeared only in the run where a test script stripped the `data-tour` attributes; the normal flow has none.
