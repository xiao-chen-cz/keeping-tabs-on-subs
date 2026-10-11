# Grader demo account for the final submission

Decided 2026-10-11. The final submission gives the AI grader its own sign-in to the production app, with fictional data only.

## Plan
- **Account:** `pnpm create-account --email grader@example.com --set full --out local-data/accounts.jsonl`. No real mailbox needed: the script creates the user already confirmed, and sign-in is email plus password, so the address is only a login name (same as `guide-walk@example.com` in D15).
- **Data:** the full set from `specs/seed-data.md` (12 subscriptions and 3 proposals), so every flag, tag, alert and total shows. Fictional only, like every other account.
- **Reminders:** sign in once and set Settings to App only. The default is App and email (`alert_channel = app_email`), and alert emails to a made-up address would bounce and hurt the sender reputation.
- **Timing:** seed dates are offsets from the day the account is seeded, and Due soon entries drop out after a few days. Reseed on submission day: `pnpm reset-account --email grader@example.com --set full`.
- **Submission:** the email and password go in the submission. They stay in `local-data/accounts.jsonl`, never in tracked files.
- **Cost:** captures by the grader run real Claude API calls on the owner's key; acceptable at grader scale.
- **After grading:** delete the account, like the tester accounts.

## Open
- Whether the grader also gets a pointer to the sample captures (`seed/captures/`) to try a capture end to end.
