# Note: Keep vs Keep quietly

Created 2026-10-19 · **PARKED: the owner is unsure the difference is needed. Ask testers before changing anything.** Not a brief milestone.

## Problem

The owner asked why EuroServer Hosting (3 days to cancel-by) was not in Due soon. It had been **Kept** for this renewal. In Upcoming it looks like any other row; only the detail page says "Kept · no reminders before 22 Oct". Cloudly Storage, by contrast, shows a **Quiet** pill. If the owner has to ask, testers will not see the difference either.

Today (logic-spec §3.2, D10, D13):
- **Keep:** one renewal. Silences the remaining reminders until the cancel-by, then reminders come back by themselves. Shown only on the detail page.
- **Keep quietly:** a lasting setting. Monthly / every 4 weeks: no routine reminders; quarterly and longer: one reminder per renewal. Price rises and trials always alert. Shown as a Quiet pill.
- A second Keep on the same row offers Keep quietly once (E44).

Both labels start with "Keep" (as does the app name), so they read as two strengths of one action rather than two durations.

## Options

**A. Keep both, make them distinct** (proposed 2026-10-19, not chosen):
- Rename Keep → "Let it renew", Keep quietly → "Mute reminders", Quiet pill → "Muted".
- Show a "Renewing" pill in Upcoming while a Keep applies to the current cancel-by.
- After the tap, the notice says when reminders come back ("We'll remind you before the next one").
- Labels only; `kept_for_cancel_by` and `alert_mode` stay. About 10 places: alert actions, detail page and history, `Tag`, tour, email digest ("Keep it", needs the send-alerts bundle redeployed), tester guide, logic-spec §3.2, tests. About 1–2 hours.

**B. One permanent action** (the owner leans this way):
- Drop the one-renewal Keep. The only "fine" answer to a reminder is the lasting quiet setting.
- A quiet row gets no routine reminders and is not in Due soon; it simply moves up in Upcoming as its renewal comes close, with its countdown.
- Open: do quarterly and yearly rows still get one reminder per renewal (D13)? Do price rises and trials still alert (probably yes)? What does "undo" mean then (unmute)? The Keep offer (E44) goes away.
- Logic change: D10, D13, E39–E48, the email digest actions, data model (`kept_for_cancel_by` unused) and their tests. More work than A; estimate once the answers are in.

## Question for testers

"When a reminder comes up for a subscription you want to keep, would you rather (a) silence it just for this renewal and be reminded next time, or (b) stop the reminders for that subscription until you switch them back on?" Also ask whether they noticed the Quiet pill and what they thought it meant.

## Tester status (2026-10-21)

- RG and LK watched the explainer video and were very positive. Neither raised an issue, so nothing needs a fixed, deferred or not-reproducible status.
- JB has not replied; the owner sees her on Sat 24 Oct and can ask her then.
- No tester has answered the Keep vs Keep quietly question. It stays parked; the decision waits for real answers (ask JB on Saturday, and RG/LK in a second-look message).
