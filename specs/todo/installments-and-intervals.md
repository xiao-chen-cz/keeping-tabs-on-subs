# Plan: installments and free intervals

Created 2026-10-09 · **PARKED (2026-10-09): after the demo. Build it only if the installment case comes up again (owner or testers).** Not a brief milestone. Estimate 2–3 days.

## 1. Problem

Some subscriptions have two schedules:

- **Term:** when you can cancel (e.g. once a year).
- **Payments:** when you pay (e.g. three installments, every 4 months).

Today one billing cycle drives both the next charge and the cancel-by date (logic-spec §2.1, §2.3). Setting such a row to "every 4 months" would produce a cancel-by and reminders before every installment, although the user can only cancel once a year.

**Workaround until then:** enter it as Yearly with the full yearly amount and write "3 installments, due every 4 months" in Notes. Cancel-by, reminders and totals are then correct; only the installment dates are not shown.

## 2. Approach

- **Term = the existing billing cycle.** It keeps driving next renewal, cancel-by, notice default, reminders, Keep and Keep quietly (D1, D5, D10, D13).
- **Optional payment schedule:** new nullable fields for the installment interval and amount. When set, the list and detail show the next installment ("next charge"); when empty, behaviour is unchanged.
- **Totals** stay based on the term amount (yearly amount ÷ 12), so installments do not change them (D7, §3.3).
- **Free intervals:** store an interval as a unit (`week` | `month`) plus a count, for both term and payments, instead of a fixed enum. Existing values map 1:1: Monthly = 1 month, Quarterly = 3 months, Every 6 months = 6 months, Yearly = 12 months, Every 4 weeks = 4 weeks. Month counts keep clamping from the anchor (§2.1).
- **Keep quietly** "long cycle" rule (one reminder per renewal) becomes "term of 3 months or longer".

## 3. Touch points

- Migration: interval columns, data migration from `billing_cycle`, payment schedule columns; `database.types.ts`.
- `src/lib/domain/types.ts` (`CYCLE_STEP`, `MONTHLY_FACTOR`, labels), `schedule`, `notice`, `alerts` (`isLongCycle`), `totals`.
- Forms (Add/Edit, review), missing-field question for the cycle (fixed options plus "other interval"), free-text answer parsing.
- Extraction prompt and schema: `billing_cycle` plus installment hints only when the source states them; never guess.
- Alert bundle (`pnpm bundle:alerts`, redeploy `send-alerts`), seed data, logic-spec (new edge cases for installments and odd intervals).

## 4. Open questions

- Does an installment get its own reminder (a payment is due), or only the term's cancel-by?
- Should the installment amount be stored or derived (term amount ÷ number of installments)?
