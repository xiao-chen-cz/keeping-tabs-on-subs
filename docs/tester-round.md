# Tester round 1

Testers are recorded by initials only. Contact details stay with the owner (`local-data/`, gitignored). Each tester has an invite-only account with the fictional starter set and the tester guide (`docs/tester-guide.md`); accounts and their data are deleted after the round.

| Tester | Invited | Account | Response | Plans to test | Follow up |
|--------|---------|---------|----------|---------------|-----------|
| JB | 2026-10-09 (email, German) | Created 2026-10-09 | Agreed | Weekend 10–11 Oct | Mon 12 Oct: ask for feedback |
| LK | Before 2026-10-09 | Created 2026-10-08 | Tested alone (no walkthrough), gave feedback 2026-10-12: 3 points, 2 fixed the same day, 1 parked (see below) | Done | Reply with what changed; ask which phone she uses (Android or iPhone) |
| RG | 2026-10-09 | Created 2026-10-09 | Tested 2026-10-09, gave feedback (Settings save should return to the list: fixed 2026-10-10). Follow-up questions sent (incl. biggest improvement), no reply yet | Done | Mon 12 Oct: nudge on the follow-up questions if still no reply |

## Status 2026-10-11 (D17)

- **LK: plans to test.** Met the owner in person today and promised to test this evening. The owner deliberately did not walk her through the app on her phone, so her feedback shows how intuitive the app is without the creator there. Next step: Mon 12 Oct, ask for feedback.
- **JB: plans to test.** Promised to test over the weekend of 10–11 Oct. No check-in sent before that deadline has passed. Next step: Mon 12 Oct, ask for feedback.
- **RG: tested** (2026-10-09). Next step: Mon 12 Oct, nudge on the follow-up questions if still no reply.

If a tester has not replied by Wed 14 Oct, recruit one more person from the owner's network the same way: ask first, and create an account only after they agree.

## Feedback 2026-10-12 (LK)

LK tested alone on her phone, without a walkthrough. Her account shows 3 captures (typed, pasted, uploaded), all approved.

1. **Take a photo directly instead of taking it first and then uploading it.** Fixed (`e5fdc1c`): on touch screens the upload field has a "Take a photo" button that opens the back camera. The "⌘V / Ctrl+V" paste hint is hidden on touch screens.
2. **Share an email from Gmail straight to the app.** Parked until after the demo.
   - Sharing one chosen email exposes no more than pasting it, so privacy is not the obstacle; the platform is.
   - On iPhone a website cannot appear in the share menu. On Android it can, once the app is added to the home screen (Web Share Target).
   - Forwarding to an address would work on every phone but is parked (`specs/todo/email-forward-capture.md`); this is the first tester request for it.
   - Meanwhile, the upload tab on phones says "Got an email? Take a screenshot and upload it here." (`e5fdc1c`).
3. **New entries did not show in Total spend.** Working as designed, but unclear. 2 of her 3 approved entries are active trials, and totals exclude trials (D7). The totals card now says "Excludes trials and cancelled subscriptions." (`e5fdc1c`).

## Status 2026-10-12 (D18)

- **LK: tested and gave feedback.** Fixed the same day and pushed (`e5fdc1c`):
  - "Take a photo" button on phones, so a receipt can be photographed without leaving the app.
  - The keyboard paste hint (⌘V / Ctrl+V) is hidden on phones.
  - The upload tab on phones says "Got an email? Take a screenshot and upload it here."
  - The totals card says "Excludes trials and cancelled subscriptions." Her new entries were missing from Total spend because 2 of 3 were trials.
  - Sharing an email straight from the mail app is parked until after the demo.
- **JB and RG:** the owner follows up tomorrow (Tue 13 Oct): JB for feedback, RG on the follow-up questions.

### Follow-up 2026-10-13

- One of LK's two "trials" was an uploaded annual energy bill. The model read no dates (correct); in the review form LK entered the last charge and, in "Trial ends", what looks like the end of a 12-month price guarantee. The app has no field for a contract end or minimum term (parked: `specs/todo/installments-and-intervals.md`).
- Fix: "Trial ends" now shows only after ticking "Free trial"; unticking clears it.
- The PDF looked like a real bill, although testers were asked to use made-up data. Its stored fields hold no personal data (no account label or payment method). On the owner's instruction the PDF file was deleted from storage on 2026-10-13 and the capture's file path cleared; the entry stays.
