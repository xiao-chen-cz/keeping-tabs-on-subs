# Grader demo account for the final submission

Decided 2026-10-11. The final submission gives the AI grader its own sign-in to the production app, with fictional data only.

**DROPPED (2026-10-19).** The challenge's AI review cannot open links, watch videos or read linked documents; it scores only check-ins, proof items and uploaded screenshots. Mark (who confirms winners) gets the public `/demo` link instead: no login, sample data, read-only. If he asks to try capture, create an account for him then. Also avoids posting shared credentials (password change via the Supabase API, vandalised data, uploads into storage). The plan below is kept for reference; captures now run on Mistral, not Claude.

## Plan
- **Account:** `pnpm create-account --email grader@example.com --set full --out local-data/accounts.jsonl`. No real mailbox needed: the script creates the user already confirmed, and sign-in is email plus password, so the address is only a login name (same as `guide-walk@example.com` in D15).
- **Data:** the full set from `specs/seed-data.md` (13 subscriptions and 3 proposals), so every flag, tag, alert and total shows. Fictional only, like every other account.
- **Reminders:** sign in once and set Settings to App only. The default is App and email (`alert_channel = app_email`), and alert emails to a made-up address would bounce and hurt the sender reputation.
- **Timing:** seed dates are offsets from the day the account is seeded, and Due soon entries drop out after a few days. Reseed on submission day: `pnpm reset-account --email grader@example.com --set full`.
- **Submission:** the email and password go in the submission. They stay in `local-data/accounts.jsonl`, never in tracked files.
- **Cost:** captures by the grader run real Claude API calls on the owner's key; acceptable at grader scale.
- **Sample captures:** the submission points the grader to `seed/captures/` in the public repo (https://github.com/xiao-chen-cz/keeping-tabs-on-subs/tree/main/seed/captures), all written for the demo:
  - `readloop-trial-email.txt`: paste it (or type a short description) to see a fresh extraction create a Trial entry. Not seeded, so this is the one to try first.
  - `noteforge-billing.png`, `codepilot-receipt.txt`, `gymbox-invoice.pdf`: already in the review queue as P1–P3 (new entry with a missing-cycle question, update with a price change, sparse invoice). The grader can review those, or upload one again to watch the extraction run.
- **After grading:** delete the account, like the tester accounts. (Decided 2026-10-11: point the grader to the captures.)
