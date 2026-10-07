# Session Handoff - 2026-10-07

## Context
Day D13, the day tester invites go out. We confirmed the D13 challenge was already met, checked the daily alert job, and reworked the header from the owner's UX feedback: the full-width bottom "Add subscription" bar read like a confirm button. We also drafted the tester invite pitch. Picks up after handoff 011 (written in a parallel session the same day).

## Completed
- **D13 challenge ("Build the renewal list") confirmed met** since D9–10: `groupAndSort` (`src/lib/domain/upcoming.ts`), name / amount + currency / timing / Trial and price-rise tags, starter set = 4 subscriptions + P1. 337 tests at the start of the session.
- **Alert job verified (read-only):** `send-alerts-daily` succeeded at 05:00 UTC on Oct 6 and Oct 7; Oct 7 response `{"ok":true,"report":[{"sent":1}]}` for the owner's demo account. The Oct 6 response row had already been purged from `net._http_response`.
- **Header rework** (`f647223`, `de6f557`, `d4b109e`, all pushed, production deploy Ready):
  - The sticky bottom bar in `renewals-list.tsx` is removed. `addHref` now only drives the empty-state link.
  - The header has a compact **+ New** (`btn-primary`, links to `/capture`, aria-label "New subscription") and a **☰ menu** (`src/components/header-menu.tsx`, client component) with Settings and Sign out. The menu closes on Escape, a tap outside, or choosing an item.
  - The Settings link and Sign out button are no longer in the header itself. The Sign out button briefly placed on the Settings page was removed again.
  - Checked with standalone Playwright at 375px and 320px: the header stays on one line at 375px, and at 320px the app name wraps while + New stays on one line. Settings navigation closes the menu, and Sign out lands on `/login`.
  - Copy: `docs/tester-guide.md` step 2 says "Tap **+ New** (top right)", and the Keep quietly hint says "under + New".
  - Tests: 339 pass (new `header-menu.test.tsx`; `renewals-list.test.tsx` updated for no bottom bar). Lint and typecheck green.
- **Tester invite pitch drafted (in chat, not in repo).** Title: "Black Week deals have a hangover. Help me cure it?" The story: a first-year deal renews a year later at full price. Example capture to type: "Cloudly subscription starting today, €4.99 for the first year, then €11.99". No forwarding mentioned (parked).
- **Relative dates:** the extraction prompt (`src/lib/extraction/prompt.ts:13`) resolves "starting today" to a real date. Untested: whether "first year, then X" plus "starting today" also fills `promo_ends` (rule: only when the source fixes both). If it doesn't, the review flow asks.
- **Email forwarding:** evaluated (plan `specs/todo/email-forward-capture.md`). The Brevo inquiry about free-plan inbound parsing and retention is open; build only if testers ask (CLAUDE.md, handoff 011).

## In Progress
- Nothing mid-edit. Working tree clean apart from this handoff.

## Next Steps
1. **Create tester accounts** when the owner sends the emails: `pnpm create-account --email <tester> --set starter --out local-data/accounts.jsonl`. Hand passwords over privately.
2. **Optional quick check before testers type the pitch example:** run "Cloudly subscription starting today, €4.99 for the first year, then €11.99" through capture on the demo account (one extraction call) and see whether `promo_ends` and the regular price are filled or asked for.
3. **Brevo reply:** record it in `specs/todo/email-forward-capture.md` Phase 0 (see handoff 011).
4. **Watch tester feedback:** capture wait time, phone photos, whether + New / ☰ are found easily, any requests for forwarding.
5. Carry-over optional items from handoffs 010/011: test proposals in `rls-tester-a` and the demo account, Due-soon-only category tabs, Brevo tracking ticket, DNS TTL.

## Key Files
- `src/app/(app)/layout.tsx` - header with + New and the menu
- `src/components/header-menu.tsx` (+ `.test.tsx`) - Settings / Sign out menu
- `src/components/renewals-list.tsx` - bottom bar removed; `addHref` only for the empty state
- `src/app/(app)/settings/page.tsx` - unchanged in the end (Sign out not here)
- `docs/tester-guide.md` - step 2 points at + New
- `specs/handoffs/011-2026-10-07-capture-live.md` - parallel handoff from today (capture live, forwarding parked)

## Blockers / Notes
- **Playwright MCP browser** was locked by another session ("Browser is already in use"). A standalone Playwright install in the session scratchpad worked instead, logging in with the `a` account from `local-data/rls-accounts.json` (read inside the script, never printed).
- **The 320px header is at its limit.** Adding anything else to the header needs the menu, not another top-level item.
- The demo banner still says "switch it off in Settings", which is fine: Settings is in the ☰ menu.
