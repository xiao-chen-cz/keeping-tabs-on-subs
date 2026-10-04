# Demo Seed Data

Fictional data for every demo and tester account. Purpose: show every flag, tag, alert and total from `logic-spec.md` on first login. No real vendors, prices or captures; real data never enters this file or the demo instance.

## Mechanics
- The seed script takes a "today" and computes every date from the offsets below, so flags and alerts are correct whenever an account is created. Reset = delete the user's rows and run the script again.
- Offsets are days from today (T). "Next +27" means Next renewal = T + 27. The script derives Last renewal date from it (Next minus one billing cycle) unless a row says otherwise.
- Defaults: Status Confirmed, Classification_Confidence High, notice per D5 (3 days Monthly / Every 4 weeks, 7 otherwise).
- Payment methods (per account): `Private account`, `Business account`. Categories as in the logic spec.
- Tests use a fixed today (e.g. 2026-10-02) with the same offsets.

## Seed sets
The seed script takes a set name.
- **starter** (default for tester accounts): subscriptions #1, #2, #3, #4 and proposal P1. Four common cases, one price-rise alert, one proposal to approve.
- **full** (your demo account, the recorded demo, test fixtures): all 13 subscriptions and all 3 proposals. Exotic cases are not shown to testers; they surface through testers' own captures.

## Subscriptions (13)

| # | Name | Amount | Cycle | Dates (offsets from T) | Other fields | Shows |
|---|---|---|---|---|---|---|
| 1 | CodePilot Pro | 20.00 USD | Monthly | Next +27 | AI, Business, Business account; Account: me@example.com | Normal monthly, USD |
| 2 | Notely Teams | 240.00 EUR | Yearly | Next +195, notice override 30 | Software / SaaS, Business, Business account | Cancel-by +165: overridden notice |
| 3 | The Daily Ledger | 2.00 EUR | Every 4 weeks | Next +6; Regular price 12.00, Promo ends +300 | Content / Media, Personal, Private account | Promo later than next renewal: Price rises No. Alert at 3 days |
| 4 | VoiceDraft Pro | 120.00 USD | Yearly | Next +10; Regular price 200.00, Promo ends = Next | Software / SaaS, Business, Business account | Price rises Yes in the alert (3 days before cancel-by) |
| 5 | StreamBox Prime | 8.99 EUR | Monthly | Trial ends +19, Last renewal empty | Content / Media, Personal | Trial tag; next renewal = trial end; excluded from totals |
| 6 | BudgetBuddy | 29.99 EUR | Yearly | Last renewal +9 (future: first charge of the new plan) | Finance / Banking, Personal, Private account; Notes: "Switched from monthly 2.99 EUR to annual, saves 20%" | Pending plan change (D4); cancel-by +2 |
| 7 | FitClub Online | 14.90 EUR | Monthly | Status Cancelled, Access until +12 | Memberships / Communities, Personal | Ending group; no renewal, no alerts; excluded from totals |
| 8 | PixelStock | 9.99 USD | (empty) | Trial ends −5, Last renewal empty | Software / SaaS, Business, Confidence Low | Needs update tag, sorted to the top; excluded from totals |
| 9 | Cloudly Storage | 9.99 EUR | Monthly | Anchored on the 31st: Last renewal = the latest 31st on or before T | Infrastructure / Hosting, Business, Business account | Month-end clamping (next renewal on the last day of a short month) |
| 10 | SafeHome Insurance | 62.00 EUR | Quarterly | Next +50 | Insurance, Personal, Private account | Quarterly; notice 7 |
| 11 | EuroServer Hosting | 11.47 EUR | Monthly | Next +20 (was +30 until 2026-10-03: about one month ahead, no past anchor reproduces it on some days) | Infrastructure / Hosting, Business, Business account; Notes: "Billed in arrears, amount varies. Was 10.34 until last quarter" | Varying amounts, price change in notes |
| 12 | ChatPal Plus | 23.00 EUR | Monthly | Next +1 | AI, Business, Confidence Low; Notes: "Looks re-activated, confirm" | Cancel-by −2: renewal ahead, deadline passed, no alert |
| 13 | CodePilot Pro | 20.00 USD | Monthly | Next +12 | AI, Business, Business account; Account: work@example.com (full set only) | Same name as #1, different login: the list shows the Account on both rows; P2 still matches only #1 |

## What a tester sees on first login (starter set)
- **Alerts due:** The Daily Ledger (cancel-by in 3 days) and VoiceDraft Pro (3 days, with the 120 → 200 USD price rise).
- **Upcoming order:** The Daily Ledger (next renewal +6), VoiceDraft Pro (+10), then CodePilot Pro (cancel-by +24) and Notely Teams (+165). Ties on cancel-by are broken by next renewal.
- **Totals:** EUR monthly 22.17, yearly 266.00 (Notely 20.00, Daily Ledger 2.17); USD monthly 30.00, yearly 360.00 (CodePilot 20.00, VoiceDraft 10.00).
- **Review queue:** P1 (NoteForge) waiting for approval.

## What the full set shows (demo account)
- **Alerts due:** The Daily Ledger (cancel-by in 3 days), VoiceDraft Pro (3 days, with price rise 120 → 200 USD), BudgetBuddy (2 days; only the 3-day alert fires).
- **Upcoming order:** PixelStock (Needs update) first, then by cancel-by: ChatPal Plus (−2), BudgetBuddy (+2), The Daily Ledger (+3), VoiceDraft Pro (+3), CodePilot Pro #13 (+9), StreamBox Prime (+16), ... (rows 1–12 keep their relative order; #13 slots in after VoiceDraft Pro)
- **Groups/tags:** Trial (StreamBox Prime), Needs update (PixelStock), Ending (FitClub Online).
- **Totals (Confirmed, no trial, with cycle):**
  - EUR: monthly 89.79, yearly 1,077.51 (Notely 20.00, Daily Ledger 2.17, BudgetBuddy 2.50, Cloudly 9.99, SafeHome 20.67, EuroServer 11.47, ChatPal 23.00). Yearly = unrounded monthly × 12.
  - USD: monthly 50.00, yearly 600.00 (CodePilot 20.00 + 20.00, VoiceDraft 10.00).
  - Excluded: StreamBox Prime (trial), FitClub Online (cancelled), PixelStock (no cycle).

## Review queue (3 proposals, all from sample captures; starter set has P1 only)

| # | Proposal | Source capture | Extracted fields | Confidence | Review path |
|---|---|---|---|---|---|
| P1 | New: NoteForge | Screenshot of a billing page (`seed/captures/noteforge-billing.png`) | Name, 12.00 USD, next renewal, cancel URL; cycle null (the page does not state it, changed 2026-10-04 so testers meet one question), notice null | Price High, category Low | Answer the billing-cycle question, confirm the category, approve |
| P2 | Update: CodePilot Pro | Pasted receipt email text (`seed/captures/codepilot-receipt.txt`) | Receipt shows 25.00 USD (was 20.00): vendor + currency + account (me@example.com, stated in the receipt) match #1, not #13 (work@example.com) → an update with a price change 20.00 → 25.00, no new entry (changed 2026-10-04). The receipt is for CodePilot's most recent charge (its current billing date, about T−3), so approving keeps the next renewal and links the receipt (changed 2026-10-04: a receipt dated today had moved the renewal to today) | High | Approve as an update |
| P3 | New: Gymbox | Sparse PDF invoice (`seed/captures/gymbox-invoice.pdf`) | Name and amount only; cycle, dates, currency null | Low on all missing fields | Edit to complete, or reject |

Extra capture for live demos (not seeded as a proposal): `seed/captures/readloop-trial-email.txt`, a "your trial ends in 3 days" email, so a tester can see a fresh extraction create a Trial entry. All four captures are written for the demo; none come from a real inbox.

## Coverage against the logic spec
E1 (#1), same name with different accounts (#1, #13), E5/E4 clamping (#9), E8 (#3), E10 (#6), E11 (#5), E13 (#8), E17 (#12), E18 (#4), E19 (#3), E26/E34 (#7), E36/E37 (totals), E28/E30/E33 (alerts #3, #4, #6), E29 (Keep on any alert), D6 Ending (#7), quarterly (#10), notice override (#2).
