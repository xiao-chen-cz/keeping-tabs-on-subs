# Session Handoff - 2026-10-14

## Context
A tester said the app was "not visual enough" and needed too much reading. This session redesigned the main screens to show state visually (countdowns, bars, cards) and cut explanatory text. All of it is pushed and live on production.

## Completed
- **List rows** (`e8a8afe`): coloured countdown tile on the left (days to cancel-by: grey > 7, amber ≤ 7, red ≤ 1; "Today", "Late", "?" for Needs update), name + tags, one line "Cancel by <date>", amount on the right. A price rise shows the new amount in red with ↑ and the old one struck through. The renewal date left the row (it is on the detail page). Screen readers still get "(in N days)" via `sr-only`.
- **Due soon** (`e8a8afe`): white cards on the green panel, same tile, full-width ✓ Keep / ✕ Cancelled buttons. The "Decide before the cancel-by date…" sentence is gone (the tour covers it).
- **Totals** (`e8a8afe`): big monthly figure, yearly figure smaller, "Excludes trials…" behind an ⓘ (`<details>`, no JS). New spend-by-category bar per currency with a legend (`spendByCategory` in `src/lib/domain/totals.ts`). Colours: dataviz reference palette as `--cat-1..8` / `--cat-other` in `globals.css`, one fixed slot per default category (validated light and dark on the app surfaces); Other, no category and user-added categories share the grey.
- **Capture label** (`e8a8afe`): "Type or paste" → "Enter text".
- **Detail page** (`a9f99b1`): summary card (amount, cycle, price rise, countdown tile, Today → Cancel by → Renews bar), buttons Edit / Mark as cancelled / Cancel page ↗; everything else under a collapsed "More details".
- **Capture** (`a9f99b1`): the options are large icon tiles; help and privacy text shortened (privacy note still says the capture goes to Anthropic's Claude outside the EU).
- **Review** (`a9f99b1`): live preview of the row as it will look in the list (`previewCore` in `src/components/review-values.ts`, `today` prop on `ReviewScreen`, passed by both review pages). Replaced the "Not in your list yet. Check the fields…" line and the Reject explainer.
- **Notices** (`a9f99b1`): one line with ✓ and Undo / Open (`NoticeLine` in `alert-actions.tsx`). `KeptNotice` lost its unused `cancelBy` prop.
- **Confidence marker** (`af1f5e2`): says "Check" instead of "low"/"medium" (red / amber) and hides while the field is empty (owner feedback: "Category low" over an empty field was confusing).
- Tour examples (`tour.tsx`) render the new row and Due soon card using the real `RowLayout` / `CountdownTile` / `AmountBlock`.
- `specs/logic-spec.md` §3: "Row display" decision added; charge-day wording updated ("Charged today", "Too late to cancel").
- 370 tests, typecheck and lint green. The alert function bundle was rebuilt and is unchanged (it only uses `formatMoney`), so no Supabase function redeploy.
- Verified in production: `/demo`, `/demo/1`, `/demo/review/P1`, `/demo/review/P3` serve the new markup.

## In Progress
- Nothing half-done in code.
- `specs/handoffs/018-2026-10-14-d17-tester-status-and-grader-plan.md` is still untracked (written in an earlier session, not part of this work). Commit it with this handoff.

## Next Steps
1. Owner: check the capture tiles on the phone (+ New). It is the one change not seen in a browser, because the page needs a login. "Take photo" should show on phones only.
2. Ask the tester who gave the feedback (and the next testers) whether the list now reads faster. Note the answer in `docs/tester-round.md`.
3. Open question from this session: with tabs/filters on, the totals card sits below the filters, about halfway down the page. Moving it up under Due soon would make the first screen more visual, but filtered totals would then sit away from the filters that change them. Not decided.
4. Then carry on with handoff 018 (D17 tester status and grader plan): sort tester feedback into blockers and nice-to-haves, set up the grader account, reseed on submission day.
5. Possible polish if testers still find it wordy: the edit form (`subscription-form.tsx`, 416 lines) and the Settings page were not touched.

## Key Files
- `src/components/renewal-row.tsx` - `CountdownTile`, `toneForDays`, `AmountBlock`, `RowLayout`, `RenewalRow`
- `src/components/due-soon.tsx` - Due soon cards
- `src/components/totals-card.tsx` - totals headline, ⓘ, category bar and colour slots
- `src/lib/domain/totals.ts` - `spendByCategory` (shares `monthlyShare` with `totalsByCurrency`)
- `src/components/subscription-detail.tsx` - summary card, `Timeline`, More details
- `src/components/capture-form.tsx` - capture tiles
- `src/components/review-screen.tsx`, `src/components/review-values.ts` - preview row, `previewCore`, filtered confidence flags
- `src/components/subscription-form.tsx` - "Check" marker
- `src/components/alert-actions.tsx` - Keep / Cancelled buttons, one-line notices
- `src/components/icons.tsx` - added Check, X, Info, ChevronDown
- `src/app/globals.css` - `--danger-light`, `--cat-*` tokens

## Blockers / Notes
- Palette check: `validate_palette.js` passes in both modes. In light mode three hues are below 3:1 contrast against white; the visible legend labels (name + amount) cover that, so keep the legend if the bar is changed.
- Category colours follow the category, not its rank. Segments are ordered by slot (the validated adjacent order), not by size. Don't sort them by amount.
- The detail-page timeline runs today → next renewal (not the full billing period), so the coloured part is the time left to decide and the grey part is the notice period.
- Pushes to `origin/main` deploy through Vercel; check the live app, not GitHub deployments (see handoff 018).
