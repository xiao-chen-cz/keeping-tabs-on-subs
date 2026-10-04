# Subscription Manager: Logic Spec

Source of truth: the owner's private Google Sheet (ID in `/local-data/private-notes.md`, not in git) (tabs Subscriptions, Upcoming, Category, Payment method, Rules).
Purpose: describe the business logic independently of Google Sheets, so it can be fine-tuned in the Sheet and later rebuilt (Next.js + Supabase demo) with tests that prove the same behaviour.
Snapshot: 2026-10-01. Status markers: **Current** = what the Sheet does today. **Decision** = open choice, to be settled in the Sheet before the build.

---

## 1. Data model

One record per subscription. "Input" fields are entered by a person or by the Gmail extraction; "Computed" fields must never be written by hand.

| Col | Field | Kind | Type | Allowed values / notes |
|---|---|---|---|---|
| A | Name | Input, required | text | Unique per subscription, by convention (not enforced) |
| B | Status | Input, required | enum | `Confirmed`, `Cancelled` (D6, D11). Cancelled rows have no renewals |
| C | Amount | Input | decimal (2 dp) | Price charged at the most recent renewal, in Currency |
| D | Currency | Input | enum | Seen: `EUR`, `USD`. No conversion anywhere |
| E | Billing cycle | Input | enum | `Monthly`, `Quarterly`, `Every 4 weeks`, `Yearly`. `Trial` is no longer a cycle value (D3). More cycles can be added later (§2.1) |
| F | Last renewal date | Input | date | Date of the most recent charge (the anchor date for the schedule) |
| G | Trial ends | Input | date | Only for trials. A trial is identified by this date, not by the cycle (D3). Billing cycle holds the plan the trial converts to |
| H | Next renewal | Computed | date | §2.1 |
| I | Days until renewal | Computed | integer | §2.2 |
| J | Cancel notice (days) | Computed default, overridable | integer | §2.3 |
| K | Cancel-by (effective) | Computed | date | §2.4 |
| L | Days until cancel-by | Computed | integer | §2.5 |
| M | Source email | Input | text / link | Gmail link, or a description such as "Screenshot ..." |
| N | Notes | Input | text | Free text; also used for proposed new categories |
| O | Category | Input | ref → Category | Category list: AI, Software / SaaS, Infrastructure / Hosting, Content / Media, Memberships / Communities, App Store, Insurance, Finance / Banking, Other. List is user-managed |
| P | Scope | Input | enum | `Business`, `Personal`, `Family` (fixed) |
| Q | Classification_Confidence | Input | enum | `High`, `Medium`, `Low` (fixed) |
| R | Payment method | Input | ref → Payment method | Nicknames per user (e.g. Private account, Business account, Family account). User-managed list. Never card or account numbers |
| S | Regular price | Input | decimal | Price after a promo ends |
| T | Promo ends | Input | date | First renewal date at which Regular price applies |
| U | Renewal amount | Computed | decimal | §2.6 |
| V | Price rises? | Computed | enum Yes/No | §2.7 |
| W | Access until | Input | date | Only when Status = Cancelled: the vendor keeps access until this date (D6). Not in the Sheet yet; added in the app |
| — | Cancellation record | Input (app only) | event | When and how the user cancelled with the vendor: date, channel, optional confirmation reference and note, optional linked capture of the confirmation (D12). Append-only, kept even if the row is reopened |

"Today" = the current date in the Sheet's time zone (see D8). All tests must inject a fixed "today".

## 2. Computed fields

### 2.1 Next renewal (H)
**Principle (D1, decided 2026-10-01): Next renewal is the first renewal date on or after today.** On the day a renewal is charged, it shows today (Days until renewal = 0), so the row stays visible as money goes out; the next day it rolls forward.

Evaluated in order; the first matching rule wins:
1. **Active trial:** Trial ends is set and Trial ends ≥ today → Next renewal = Trial ends.
2. **Missing data:** Last renewal date or Billing cycle is empty, or the cycle is not in the list → empty, and the row is flagged **Needs update** (§2.8).
3. **Last renewal today or in the future:** Last renewal date ≥ today → Next renewal = Last renewal date (valid for a pending plan change, see D4).
4. **Every 4 weeks:** the first date Last renewal + 28 × n days (n ≥ 1) on or after today.
5. **Month-based cycles:** the first date Last renewal + n × k months (n ≥ 1) on or after today, with k = 1 (Monthly), 3 (Quarterly), 12 (Yearly).

A new cycle is added by one enum value plus one entry: either a day interval (like Every 4 weeks) or a month interval k. Unknown values are rejected, never treated as Monthly (D3).

Month addition clamps to the end of the month (31 Jan + 1 month = 28/29 Feb) and is always counted from the original anchor date. It is not added step by step, so 31 Jan → 28 Feb → 31 Mar (no drift to the 28th). A clamped date that equals today counts as today, like any other renewal on today.

### 2.2 Days until renewal (I)
Next renewal − today, in days. Empty if Next renewal is empty. Always ≥ 0; 0 means the renewal is charged today.

### 2.3 Cancel notice (J)
Default by cycle, overridable per row (D5, decided 2026-10-02). Empty if Name is empty. Default: `Monthly` or `Every 4 weeks` → 3 days; every other cycle (Quarterly, Yearly) → 7 days. An empty or unknown cycle also gets 7 days (e.g. a trial with no follow-up plan yet, E12). A number typed into the cell replaces the default for that subscription (e.g. 30 for a contract with a one-month notice period).

### 2.4 Cancel-by (K)
Next renewal − Cancel notice. Empty if Next renewal is empty. If Cancel notice is empty or not a number, the default from §2.3 is used, so a new row without a J value still gets a correct cancel-by.

### 2.5 Days until cancel-by (L)
Cancel-by − today. Can be negative (deadline passed, renewal still ahead).

### 2.6 Renewal amount (U)
- Empty if Name or Amount is empty.
- If Regular price, Promo ends and Next renewal are all set **and** Promo ends ≤ Next renewal → Regular price.
- Otherwise → Amount.

This applies only to the *next* renewal, not to later ones.

### 2.7 Price rises? (V)
- Empty if Name is empty, or Amount or Renewal amount is not a number.
- `Yes` if Renewal amount > Amount, otherwise `No` (a price drop shows `No`).

### 2.8 Flags (computed, never stored)
- **Needs update** (D2): Name set, Status ≠ Cancelled and Next renewal empty. Covers an ended trial with no Last renewal date and cycle, a missing anchor, or an unknown cycle. Shown in the front end as a tag and sorted to the top of Upcoming.
- **Trial** (D3): Trial ends is set and ≥ today. Shown as a tag so trials are distinguishable from paid subscriptions. The tag disappears the day after Trial ends; the row then shows normally, or as Needs update if no follow-up data exists.

- **Ending** (D6): Status = Cancelled and Access until ≥ today. Shown in its own "Ending" group in the app with the access-until date and a tag; no renewal, no alerts, not in Upcoming. After Access until, the row is shown only in the archive/cancelled filter.

## 3. Views

### 3.1 Upcoming
- Rows: Name not empty **and** Status ≠ `Cancelled`.
- Columns: Name, Status, Amount, Currency, Next renewal, Days until renewal, Cancel-by, Days until cancel-by, Renewal amount, Price rises?
- Sort (D2): rows flagged **Needs update** first, then Cancel-by ascending; ties on Cancel-by are broken by Next renewal ascending, then by Name.
- Tags (§2.8): a **Trial** tag on active trials and a **Needs update** tag are shown next to the name, so they stand out from other rows.
- No time window: every active subscription is listed, including those whose cancel-by date has already passed.
- **Due soon first, no duplicates (app, decided 2026-10-04):** rows with an alert due (§3.2) are shown in a Due soon section above Upcoming and are left out of the Upcoming list, so each row appears once. Totals still count every included row.
- Highlight: Renewal amount and Price rises? cells are highlighted (#D9D2E9) when Price rises? = Yes. Columns A–H have their own conditional formats; their rules are not documented here.

### 3.2 Reminders (D10, decided 2026-10-02)
Per-user list of alert offsets in days before Cancel-by, default **3, 1, 0**. Alerts are in-app (due-soon view) and sent by email (committed for D21–23): a daily job sends one email per row and offset, with Keep and Cancelled links.

**When an alert fires.** For each active row (Status ≠ Cancelled, Next renewal set, not Kept): once Days until cancel-by L reaches an offset (L ≤ 3, L ≤ 1, L ≤ 0), that offset's alert is sent once per renewal. If several offsets are reached at once (row added late, job missed a day), only the smallest reached offset is sent. No alerts once L < 0 (deadline passed); the row stays in Upcoming.

**Content.** Name, Amount + Currency, Next renewal, Cancel-by, Days left, cancel URL if known. If Price rises? = Yes, the same alert states Amount → Renewal amount. There is no separate price alert.

**Actions on an alert (one tap, in the app or from the email link).**
- **Keep:** "renewal is fine". Silences all remaining alerts for this renewal, including price-rise nudges. Stored as the Cancel-by date it applies to (`kept_for_cancel_by`). It expires by itself: after the renewal the next Cancel-by is a different date, so alerts resume for the following renewal.
- **Cancelled:** sets Status = Cancelled. The row leaves Upcoming and alerts stop. The user cancels with the vendor themselves (cancel URL shown; no automatic cancellation).
- No reply: alerts continue at the remaining offsets.

**Rules.** Changing Cancel-by (new anchor, notice or plan change) invalidates Keep and resets which offsets were sent. Rows flagged Needs update get no cancel-by alerts (they have no date); they are flagged in the app. Active trials alert on the Trial ends date like any renewal. "Today" uses the time zone from D8.

### 3.3 Totals (D7)
Running cost shown per currency, never converted: one monthly and one yearly total for EUR and one for USD. Included: Status = Confirmed and no active trial. Excluded: Cancelled (including Ending), active trials and rows without a cycle (Needs update). Based on Amount (the current price), not Renewal amount. Monthly equivalent per row: Monthly × 1, Quarterly ÷ 3, Yearly ÷ 12, Every 4 weeks × 13 ÷ 12. Yearly total = monthly total × 12. Other currencies are listed as their own total.

## 4. Data entry and extraction rules
From the Rules tab. These apply to whoever adds rows, today the Gmail extraction, later the app's input validation.

1. Category, Scope and Classification_Confidence are filled only when empty; never overwrite a set value.
2. Category comes only from the Category list. If nothing fits, leave it empty and propose a new category in Notes. Scope and Confidence come only from their fixed lists.
3. Category is inferred from service name, plan and sender.
4. Scope = Business if the invoice names the user's business or business domain, shows a VAT or reverse-charge number, was forwarded to the user's receipts address, or is paid with a payment method already used for business. Family only if the payment is visibly from the shared family account. Personal only if visibly private.
5. No Scope evidence → still suggest a Scope, with Confidence = Low.
6. Confidence = the lower of the Category and Scope confidence. High = explicit evidence in the email, Medium = indirect evidence, Low = guess.
7. Only write what the sources show. Never store card numbers or other payment details.
8. Payment method only when the email or receipt shows it, as a nickname. A known payment method also counts as Scope evidence.
9. Regular price and Promo ends only when a source states both the post-promo price and its start date; never estimate. Computed fields (H–L, U, V) are never written.

10. **Required fields and missing-field questions (app).** A proposal can be approved only when it has name, amount, currency, billing cycle and one date (Last renewal date, or Trial ends for an active trial). For each required field that is empty, the app asks a fixed question (e.g. cycle: Monthly / Quarterly / Every 4 weeks / Yearly; "When was the last charge?"). The model only parses free-text answers. Optional fields (notice days, cancel URL, payment method, Regular price + Promo ends) are never forced. Applies to every input type: typed description, upload, paste.

App implications: Scope, Confidence, Billing cycle, Status and Currency become enum/check constraints. Category and Payment method become lookup tables with foreign keys. Computed fields become a database view (or generated logic), not stored columns.

## 5. Edge cases and expected results

Today = 2026-10-01 unless stated. "Current" is the Sheet's output; where a Decision is open, the proposed expectation is given separately.

| # | Case | Input | Expected (Current) | Proposed if different |
|---|---|---|---|---|
| E1 | Monthly, normal | Monthly, F 2026-09-15 | H 2026-10-15, I 14, J 3, K 2026-10-12, L 11 | — |
| E2 | Monthly, renewal is today | Monthly, F 2026-08-01 (EuroServer Hosting) | H 2026-10-01, I 0, J 3, K 2026-09-28, L −3 | — |
| E2b | Same, one day later | Monthly, F 2026-08-01, today 2026-10-02 | H 2026-11-01, I 30 | — |
| E3 | Monthly from the 31st, short month | Monthly, F 2026-01-31, today 2026-02-15 | H 2026-02-28 | — |
| E4 | Month-end anchor kept | Monthly, F 2026-01-31, today 2026-03-01 | H 2026-03-31 (not 03-28) | — |
| E5 | Month-end, today = clamped renewal | Monthly, F 2026-01-31, today 2026-02-28 | H 2026-02-28, I 0 (counts as today, like E2) | — |
| E5b | Yearly from 29 Feb, today = clamped renewal | Yearly, F 2024-02-29, today 2025-02-28 | H 2025-02-28, I 0 | — |
| E6 | Yearly from 29 Feb | Yearly, F 2024-02-29 | H 2027-02-28 | — |
| E7 | Yearly from 29 Feb, next leap year | Yearly, F 2024-02-29, today 2027-03-01 | H 2028-02-29 | — |
| E8 | Every 4 weeks, normal | 4-weekly, F 2026-09-10 | H 2026-10-08, I 7, J 3, K 2026-10-05, L 4 | — |
| E9 | Every 4 weeks, renewal is today | 4-weekly, F 2026-09-10, today 2026-10-08 | H 2026-10-08, I 0 | — |
| E9b | Last renewal is today | Monthly, F 2026-10-01 | H 2026-10-01, I 0 (tomorrow: 2026-11-01) | — |
| E10 | Last renewal in the future (pending plan change) | Yearly, C 29.99, F 2026-10-11 (BudgetBuddy, was 2.99 monthly), today 2026-10-02 | H 2026-10-11, I 9, J 7, K 2026-10-04, L 2, U 29.99, V No (D4: valid, no flag) | — |
| E10b | Same, day after the first charge | As E10, today 2026-10-12 | H 2027-10-11, I 364 | — |
| E11 | Active trial | Monthly, G 2026-10-21, F empty | H 2026-10-21, I 20, J 3, K 2026-10-18, L 17; tag Trial | D3: cycle is the post-trial plan (Current in the Sheet: cycle `Trial`, J 7, K 2026-10-14) |
| E12 | Trial ends today | G 2026-10-01, F empty | H 2026-10-01, I 0, K 2026-09-24, L −7 | — |
| E13 | Trial ended, no follow-up data | G 2026-09-30, F empty | H, I, K, L all empty; tag Needs update, sorted to the top of Upcoming (D2) | Current in the Sheet: no flag, sorted last |
| E14 | Trial ended, converted | G 2026-10-21, E Monthly, F 2026-10-21, today 2026-11-05 | H 2026-11-21, J 3 | — |
| E15 | Missing anchor | F empty, no trial (or E empty) | H, I, K, L empty | — |
| E16 | Unknown cycle with F set | E `Trial` or `Biweekly`, F 2026-09-15 | Rejected on entry; if present: H empty, tag Needs update (D3) | Current in the Sheet: treated as Monthly, H 2026-10-15, J 7 |
| E16b | Quarterly | Quarterly, F 2026-08-15, today 2026-10-01 | H 2026-11-15, J 7, K 2026-11-08 | Current in the Sheet: treated as Monthly (H 2026-10-15) until H is updated |
| E17 | Cancel-by already passed | Monthly, F 2026-09-02 (ChatPal Plus) | H 2026-10-02, I 1, K 2026-09-29, L −2 | — |
| E18 | Promo ends on next renewal | C 120, S 200, T = H = 2027-06-06 (VoiceDraft Pro) | U 200, V Yes | — |
| E19 | Promo ends after next renewal | C 2, S 12, T 2027-09-09, H 2026-10-08 (The Daily Ledger) | U 2, V No | — |
| E20 | Promo ends one day after next renewal | T = H + 1 | U = C, V No | — |
| E21 | Regular price lower than Amount | C 20, S 10, T ≤ H | U 10, V No | — |
| E22 | Only one of S / T filled | S 12, T empty (or reverse) | U = C, V No | — |
| E23 | Promo passed, Amount not updated | C 2, S 12, T 2027-09-09, today 2027-10-01 | U 12, V Yes, again at every renewal until C is updated | D9 |
| E24 | Amount empty | C empty | U empty, V empty | — |
| E25 | Name empty | A empty | H–L, U, V empty; row ignored by Upcoming | — |
| E26 | Cancelled subscription | B Cancelled | Next renewal empty, no flag, excluded from Upcoming and alerts (D6) | Current in the Sheet: dates still computed |
| E27 | Mixed currencies | EUR and USD rows | No conversion; amounts never summed | D7 |
| E28 | Alert offsets | Cancel-by 2026-10-04 | Alerts on 2026-10-01 (3), 2026-10-03 (1), 2026-10-04 (0) | — |
| E29 | Keep at first alert | Keep tapped 2026-10-01 | No further alerts for that renewal; next cycle's alerts resume | — |
| E30 | Row added late | New row, L = 2 | One alert (offset 3 reached), not three | — |
| E31 | Deadline passed | L = −1 | No alert; row stays in Upcoming | — |
| E32 | Cancel-by moves after Keep | Kept for 2026-10-04, plan change moves Cancel-by to 2026-10-11 | Keep invalid, alerts start again | — |
| E33 | Price rise inside an alert | V = Yes, L = 3 | Single alert shows Amount → Renewal amount | — |
| E34 | Cancelled, access until | B Cancelled, W 2026-12-31, today 2026-10-02 | Ending tag, no renewal, no alerts; totals exclude it | — |
| E35 | Access ended | B Cancelled, W 2026-12-31, today 2027-01-01 | Only in the cancelled/archive filter | — |
| E36 | Totals | EUR: Monthly 10, Yearly 120, Every 4 weeks 2 | EUR monthly 10 + 10 + 2.17 = 22.17; yearly 266.00 | — |
| E37 | Active trial in totals | Active trial with Amount 8.99 | Not counted until Trial ends passes | — |

## 6. Decisions to settle in the Sheet before the build

- **D1 Renewal day: DECIDED 2026-10-01.** Next renewal is the first renewal date on or after today, for every cycle, for clamped month-end dates and for trials (§2.1). A renewal on today shows Days until renewal = 0. Implemented in the Sheet (H column).
- **D2 Ended trials: DECIDED 2026-10-02.** A row with no Next renewal (ended trial without Last renewal date and cycle, missing anchor, unknown cycle) is flagged **Needs update** instead of silently losing its dates, and is sorted to the top of Upcoming (§2.8, §3.1).
- **D3 Billing cycle values: DECIDED 2026-10-02.** `Trial` is dropped as a cycle. A trial is identified by Trial ends ≥ today and shown with a **Trial** tag in the front end; Billing cycle holds the plan it converts to. `Quarterly` is added. Allowed cycles: Monthly, Quarterly, Every 4 weeks, Yearly; unknown values are rejected, not treated as Monthly. Further cycles can be added later (§2.1). Sheet done 2026-10-02: the trial row's cycle is now `Monthly`, H has a Quarterly branch, data validation on column E (by the user). Still open in the Sheet: no Trial / Needs update tags or top sorting in Upcoming (front-end only for now).
- **D4 Future Last renewal date: DECIDED 2026-10-02.** Valid. A future Last renewal date is the first charge of a new or changed plan (e.g. BudgetBuddy switching from monthly 2.99 EUR to yearly 29.99 EUR, first annual charge 2026-10-11) and is treated as the next renewal (§2.1 rule 3); Amount holds that upcoming price. It is not an error. No warning. Since 2026-10-04 the app labels the field "Billing date (last or next charge)" and shows a future value as "Next charge", because a stated next charge from a capture uses the same field; the "plan starts on" hint was dropped. Record the previous price and cycle in Notes. The cancel-by of such a row may be noise if the user intends to keep it; accepted.
- **D5 Cancel notice: DECIDED 2026-10-02.** 3 or 7 days by cycle as the default, overridable per row (§2.3). In the app: a nullable `cancel_notice_days` column, with the default applied when it is null.
- **D6 Status: DECIDED 2026-10-02.** Status stays Confirmed / Cancelled. New nullable date Access until for "cancelled, access until X" (W). Cancelled rows stop computing renewals (Next renewal empty, no Needs update flag, no alerts) and show in an Ending group while Access until ≥ today (§2.8). Sheet change pending: add column W and make H empty for Cancelled.
- **D7 Currency: DECIDED 2026-10-02.** Totals per currency (EUR and USD separately), monthly and yearly, no conversion (§3.3). Open only if a combined total in one base currency is wanted later (needs a rate source).
- **D8 Time zone: DECIDED 2026-10-02.** Not relevant at day granularity: "today" is the user's local date, default Europe/Berlin, same value for the app and the reminder job. Tests inject a fixed today.
- **D9 After a promo: DECIDED 2026-10-02.** The price must be updated: when the first full-price receipt arrives, the review queue proposes a new Amount and clears Regular price / Promo ends; the user approves. Until then Price rises? stays Yes (E23) so alerts keep showing the higher price. Not chosen: deriving the current price automatically from Regular price after the promo date.
- **D10 Reminders: DECIDED 2026-10-02.** Alerts at 3, 1 and 0 days before Cancel-by (per-user list, default 3,1,0), each once per renewal; Keep or Cancelled in one tap stops the rest; price rises are part of the same alert, not a separate one (§3.2, E28–E33).
- **D11 Status list: DECIDED 2026-10-02.** Status = Confirmed, Cancelled; Billing cycle per D3.
- **D12 Cancellation record: DECIDED 2026-10-04.** Every change to Cancelled records, as proof, when the user cancelled with the vendor and how: `cancelled_on` (date, defaults to today, user can correct it), `channel` (Website / app, Email, Phone, Letter, In person, Other), optional `reference` (confirmation or ticket number, never card or account numbers) and `note`, optional link to a capture of the confirmation (email or screenshot), and `recorded_at` (timestamp, set by the system). Stored as an append-only event log (no edit, no delete), so reopening or editing the subscription never erases it; reopening (Cancelled → Confirmed) is recorded as its own event. The detail page shows the history. The Sheet does not track this.

## 7. Data issues spotted while writing this
Not logic issues; fix in the Sheet:
Tracked privately in `/local-data/private-notes.md` (the owner's real Sheet rows are not kept in git).

## Appendix: current Sheet formulas (row 2)
```
H2  =MAP(A2:A,E2:E,F2:F,G2:G,LAMBDA(a,e,f,g,IF(a="","",LET(d,TODAY(),IF(AND(ISNUMBER(g),g>=d),g,IF(OR(f="",e=""),"",IF(f>=d,f,IF(e="Every 4 weeks",f+28*ROUNDUP((d-f)/28,0),LET(s,IF(e="Yearly",12,IF(e="Quarterly",3,1)),k,INT(DATEDIF(f,d,"M")/s),r,EDATE(f,k*s),IF(r>=d,r,EDATE(f,(k+1)*s)))))))))))
I2  =ARRAYFORMULA(IF(H2:H="","",H2:H-TODAY()))
J2  =IF(A2="","",IF(OR(E2="Monthly",E2="Every 4 weeks"),3,7))      (per row, rows 2–19; overwrite with a number to override)
K2  =ARRAYFORMULA(IF(H2:H="","",H2:H-IF(ISNUMBER(J2:J),J2:J,IF((E2:E="Monthly")+(E2:E="Every 4 weeks"),3,7))))
L2  =ARRAYFORMULA(IF(K2:K="","",K2:K-TODAY()))
U2  =ARRAYFORMULA(IF((A2:A="")+(C2:C=""),"",IF(ISNUMBER(S2:S)*ISNUMBER(T2:T)*ISNUMBER(H2:H)*(T2:T<=H2:H),S2:S,C2:C)))
V2  =ARRAYFORMULA(IF((A2:A="")+NOT(ISNUMBER(C2:C))+NOT(ISNUMBER(U2:U)),"",IF(U2:U>C2:C,"Yes","No")))
Upcoming!A2  =IFERROR(SORT(CHOOSECOLS(FILTER(Subscriptions!A2:V,Subscriptions!A2:A<>"",Subscriptions!B2:B<>"Cancelled"),1,2,3,4,8,9,11,12,21,22),7,TRUE),"")
```
Since 2026-10-02, H, I, K, L, U and V are each a single array formula in row 2 that covers every row, so new rows are picked up automatically. Never type into those columns below row 2: that breaks the array (#REF!). J is the exception: per-row formulas for existing rows, safe to overwrite with a number; for a new row, leave J empty (K applies the default) or type a number.
