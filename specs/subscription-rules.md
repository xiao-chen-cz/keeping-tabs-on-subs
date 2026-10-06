# Subscription fields and date rules (D10)

Short rules note for the TypeScript type in `src/lib/domain/types.ts`. The full logic, with every edge case, is in `logic-spec.md`; this note is the summary a reader needs before touching the code.

## Fields

| Need | Field(s) | Notes |
|---|---|---|
| Billing interval | `billingCycle` | `monthly`, `quarterly`, `every_4_weeks`, `yearly`. Steps live in `CYCLE_STEP`; a new cycle is one entry. |
| Current price | `amountCents` + `currency` | Price at the most recent charge. Integer cents, never floats. |
| Future price | `regularPriceCents` + `promoEnds` | Both or neither. Applies from the first renewal on or after `promoEnds`. |
| Renewal date | `lastRenewalDate` (input) → `nextRenewal` (computed) | Only the anchor is stored. |
| Notice period | `cancelNoticeDays` | Null = default: 3 days for Monthly and Every 4 weeks, 7 otherwise (also when the cycle is unknown). |
| Cancel-by | computed | `nextRenewal − noticeDays`. Can be in the past while the renewal is still ahead. |
| Trial | `trialEnds` | A trial is identified by this date, not by a cycle. `billingCycle` holds the plan it converts to. |
| Promo | `regularPriceCents` + `promoEnds` | See future price. |
| Cancelled with access | `status = cancelled` + `accessUntil` | Shown in an Ending group until `accessUntil`. |

Computed, never stored or typed: next renewal, days until renewal, cancel-by, days until cancel-by, renewal amount, price rises, and the Trial / Needs update / Ending tags.

## Date rules

- Dates are `YYYY-MM-DD` strings. "Today" is the user's local date (default Europe/Berlin) and is always passed in, never read inside the logic.
- **Next renewal** is the first renewal on or after today. A renewal today shows 0 days.
- **Order of checks:** cancelled → none; active trial → trial end; missing anchor or cycle → none (Needs update); anchor today or later → the anchor (a new plan's first charge); otherwise step from the anchor.
- **Months** are added from the original anchor and clamp to the month end: 31 Jan → 28 Feb → 31 Mar (no drift to the 28th). 29 Feb yearly → 28 Feb, and 29 Feb again in leap years.

## 4-week billing

Every 4 weeks is a day interval, not a month interval: renewals are anchor + 28·n days. The renewal date drifts through the calendar (13 charges a year), so it is never approximated as monthly. For totals, one charge counts as 13/12 of a month (2.00 every 4 weeks = 2.17 a month). Its default notice is 3 days, like Monthly.

## Missing values

- Every field a person might not know is nullable, and **null means unknown**: never 0, never a guessed date. Extraction returns null for anything the source does not state.
- **No anchor or no cycle** (and no active trial): no next renewal, no cancel-by, and the row gets the **Needs update** tag and sorts to the top.
- **Unknown cycle** text (e.g. "Biweekly"): rejected on entry; if it arrives anyway it is treated as null (Needs update), never as Monthly.
- **No amount:** no renewal amount and no price-rise flag; the row stays in the list, but not in the totals.
- **Only one of regular price / promo ends:** neither applies (the database rejects it).
- **No notice days:** the default by cycle.
- **Approval** of a proposed entry needs name, amount, currency, cycle and one date (last renewal or trial end). Missing ones are asked as fixed questions; only the user supplies them.
- **A stated next renewal date** (e.g. "renews on 30 Oct" on a billing page) is stored as `lastRenewalDate` with that future date. By the rule for an anchor today or later, it is the next renewal, and it rolls forward after the charge. No past charge is invented. The UI calls this field **Billing date (last or next charge)** and shows it as "Next charge" or "Last charge"; there is no "plan starts on" hint, because a future date does not always mean a plan change (decided 2026-10-04).

## The five sample cases (starter set)

Represented in `src/lib/domain/sample-cases.test.ts` with no invented values:

1. **CodePilot Pro:** 20.00 USD monthly, a normal case.
2. **Notely Teams:** 240.00 EUR yearly with a 30-day notice override.
3. **The Daily Ledger:** 2.00 EUR every 4 weeks, regular price 12.00 from a promo end after the next renewal (no rise yet).
4. **VoiceDraft Pro:** 120.00 USD yearly, promo ends on the next renewal (rises to 200.00).
5. **P1 NoteForge (proposal):** 12.00 USD with a stated next renewal and cancel URL. The billing page does not state the cycle, so it stays null and the review asks one question (the tester answers Monthly). Notice, category, scope and payment method stay null, and its per-field confidence is kept.
