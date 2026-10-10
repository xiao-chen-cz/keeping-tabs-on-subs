# Tester journey check (D15)

Run on production (`keeping-tabs-on-subs.vercel.app`) on 2026-10-09, with the test account `guide-walk@example.com` reset to the starter set. Driven in Chrome at 390 px (phone) and 1280 px (desktop). All captures were made up for the test. No console errors on any page.

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Invite: owner creates the account (`pnpm create-account --set starter`) | Pass | 4 subscriptions + 1 proposal; password saved to `local-data/accounts.jsonl` |
| 2 | Signed-out visit redirects to `/login` | Pass | |
| 3 | Wrong password | Pass | "Email or password is wrong" |
| 4 | Sign in | Pass | ~2.5 s to the list |
| 5 | First-sign-in tour, 7 stops, list → Settings, Done | Pass | Every list stop found its element |
| 6 | `/demo` without sign-in | Pass | Read-only sample, banner says nothing is real |
| 7 | Capture: typed description, English, cycle left out | Pass | ~13 s to the review page |
| 8 | Capture: typed description in German | Pass | ~6 s; name, amount, EUR, monthly, date, plan all read |
| 9 | Capture: pasted receipt email | Pass | ~4 s; yearly USD, paid date used as billing date |
| 10 | Capture: uploaded billing screenshot (PNG) | Pass | ~4 s; masked card number not stored |
| 11 | Review question "How often is it charged?" | Pass | One tap fills Billing cycle |
| 12 | Seeded proposal shows its question | Pass | |
| 13 | Approve → list, confirmation banner | Pass | "Renews 20 Oct, cancel by 17 Oct" (3-day monthly default) |
| 14 | Renewal-sorted list and per-currency totals | Pass | EUR totals moved by exactly the new entry (4.99 / 59.88) |
| 15 | Detail view | Pass | Next renewal, cancel-by, notice "(default)", source Capture, original capture linked |
| 16 | Edit notice to 7 days | Pass | Cancel-by moves to 13 Oct, notice "(custom)" |
| 17 | Mark as cancelled with confirmation number, access-until and screenshot | Pass | Ending group in list; History entry with ref and screenshot |
| 18 | Reopen | Pass | Back to Confirmed with renewals |
| 19 | Due soon: Keep, then Undo | Pass | |
| 20 | Detail: Keep quietly | Pass | Saved; "Quiet" badge on the list |
| 21 | Settings: app only, untick "On the day", save, reload | Pass | Persisted; restored afterwards |
| 22 | Email alerts | Pass (job only) | Daily job ran today at 07:00 Berlin and recorded each send with an email id; no tester inbox checked today |
| 23 | Desktop layout (1280 px) | Pass | |

## Confusing, not blocking

- **Stale note after answering a question.** The extraction wrote "billing cycle not stated" into Notes; it stays after the tester answers Monthly. **Fixed 2026-10-10** (`7fa8f28`): Notes no longer hold remarks about missing fields; verified in production (capture without a cycle leaves Notes empty).
- **"Next charge" on a cancelled subscription.** The detail page of a cancelled entry still shows "Next charge 20 Oct" (the billing date). It reads as if a charge is still coming. **Fixed 2026-10-10** (`7fa8f28`): a future charge is hidden on cancelled rows, a past one still shows as Last charge; verified in production (hidden when cancelled, back after Reopen).

## Fixes today

None: no blockers found.

## Fixes 2026-10-10

- The two points above.
- Tester feedback: saving Settings now returns to the list with a "Settings saved." notice instead of staying on Settings. Verified in production.
