# Session Handoff - 2026-10-09

## Context
Continuation of handoff 015 (first-sign-in tour). Fixed tour replay, parked German/English, and onboarded the first real tester: created the account, decided what to send, and drafted the invite email.

## Completed
- **Replay tour** (`3537af7`, pushed, deployed): "Replay tour" in the ☰ menu; a replay after a closed tour on the same page now starts a fresh tour (`AppTour` remounts when `?tour` reappears).
- **The owner's account was already marked as seen** (`tour_done_at` set while trying the tour locally against the hosted DB). Not cleared; the owner uses ☰ → Replay tour.
- **German/English parked** (`27eb4b3`): `specs/todo/i18n-de-en.md`, about 4–5 days with `next-intl` and `profiles.locale`, after the demo. Testers are fine in English.
- **Handoff 015** committed and pushed (`27eb4b3`).
- **First real tester account** created on production with the starter set on 2026-10-08 (`pnpm create-account ... --set starter --out local-data/accounts.jsonl`). The email and password are only in `local-data/accounts.jsonl` (gitignored); never put them in tracked files.
- **Onboarding decision:** testers do not get `docs/tester-guide.md`. The tour plus a short invite message replaces it. The message covers:
  - made-up data only (captures go to an AI model);
  - 10–15 min on the phone: add one, review the waiting entry, Keep/Cancel on Due soon;
  - expect a reminder email;
  - feedback = where you hesitated or guessed;
  - the account is deleted after the test.

  The password is sent separately.
- **Invite drafted** in German (du form) in the owner's Gmail drafts, addressed to the tester, subject "Dein Testzugang für Keeping Tabs on Subs". Not sent by Claude.
- **Tester guide wording** (tour covers list and Settings, replay from ☰) was committed by a parallel session as `5cca4a2`.
- **Answered:**
  - Due soon starts at the largest reminder offset before the cancel-by (default 3 days), not before the renewal.
  - There is no password change or reset in the app; a lost password means a new one set by Claude.

## Parallel session (same day, not from this conversation)
`bbb938a` D15 tester journey checklist, `76f18ad` Every 6 months billing cycle, `13391d1` installments and free intervals plan parked (`specs/todo/installments-and-intervals.md`). `main` is 2 commits ahead of `origin/main` at the time of writing; see that session's notes before pushing.

## In Progress
- The invite email is a draft; the owner sends it and the password.

## Next Steps
1. **Commit this handoff**; push together with the 2 unpushed commits from the parallel session (owner OK).
2. **Tester timing:** the seeded Due soon entries (The Daily Ledger, VoiceDraft Pro) have cancel-by 11 Oct and drop out on 12 Oct.
   - If the tester starts after 11 Oct, run `pnpm reset-account --email <tester> --set starter` that morning.
   - The draft says "Morgen früh" for the reminder email; adjust it if it is sent later.
3. Optional: shorten `docs/tester-guide.md` to match the invite message (owner's reference only), so the two do not contradict each other.
4. Create more tester accounts the same way when the owner sends emails; send the German or English invite variant.
5. Carried over: try a cancel with a pasted confirmation screenshot on production; check Add/Edit form layout signed in; optional `promo_ends` capture check; watch tester feedback (tour skipped or too long, capture wait, phone photos, + New / ☰, form length, requests for forwarding).

## Key Files
- `src/components/tour.tsx` - `AppTour` with `useSearchParams` remount logic
- `src/components/header-menu.tsx` (+ test) - Replay tour item
- `specs/todo/i18n-de-en.md` - parked DE/EN plan
- `docs/tester-guide.md` - kept as the owner's reference, not sent to testers
- `local-data/accounts.jsonl` - tester credentials (gitignored)

## Blockers / Notes
- Personal data rule: tester emails and names stay out of tracked files (public repo), like the owner's data.
- The alert job emails testers by default (`app_email`). The starter set triggers reminders on the days after seeding, so tell testers before they start.
