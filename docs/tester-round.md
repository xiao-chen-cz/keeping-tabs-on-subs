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
- LK on screenshots of emails (2026-10-13): too many steps (screenshot, save, leave the app, find it in the gallery, upload). Fix: a "Paste screenshot" button on phones reads a copied screenshot from the clipboard. On iPhone: screenshot → tap the preview → Done → Copy and Delete → Paste screenshot. No gallery step.

## Status 2026-10-15 (D21)

- **JB:** looked at the app a few days ago but has not written it up yet. The owner told her what changed since (mainly the visual redesign); she will take another look.
- **RG:** said the app was "not visual enough" (too much reading). The redesign shipped on 14 Oct. She promised another look.
- **Lesson:** testers lose interest when testing with made-up data. A second look has to be quick and easy to ask for (see fix 4).

## Fix list 2026-10-15 (D21)

Evidence so far: 3 testers. LK gave written feedback twice, RG gave two points (Settings save, then "not visual enough"), and JB's write-up is still to come. The owner also tested on an iPhone. Most reported problems were fixed the same day, so this list is short on purpose.

### Selected (in order)

1. **Check the live phone fixes on an iPhone:** capture tiles, photo preview proportions, Free trial toggle, icons.
   *Evidence:* shipped 13–14 Oct and seen only in a desktop browser. The preview distortion was found on the owner's phone.
   *Why it matters:* testers use phones and the demo is recorded on one. A layout break on the capture screen blocks the core flow (capture → review → list).
2. **Confirm the visual redesign with RG (who said "too much reading") and JB on their second look.**
   *Evidence:* the redesign (`e8a8afe`, `a9f99b1`, `af1f5e2`) answers RG's comment and has not been confirmed with her.
   *Why it matters:* it changed every main screen, so it is the biggest unchecked change before the demo.
3. **Email-to-app friction: keep Paste screenshot as the answer and check it once more end to end** (screenshot → copy → Paste screenshot → review → approve).
   *Evidence:* the only repeated problem. LK raised it twice (share from Gmail on 12 Oct; too many screenshot steps on 13 Oct). Paste screenshot (`88126fb`) verified on iPhone on 13 Oct.
   *Why it matters:* capture from a real email is the demo's main promise. Manual entry is only a fallback.
4. **Make the second look cheap:** send JB and RG a short checklist (about 5 minutes): add one subscription by Paste screenshot or Text, approve it, find it in Due soon, then answer 3 questions (what was confusing, what took too long, would you use it).
   *Evidence:* JB has not written her feedback up yet. RG has given two short comments but has not looked at the app since the redesign.
   *Why it matters:* D24–27 needs feedback from 2–3 users. Right now only LK has given detailed written feedback.

Anything JB or RG report that blocks the core flow goes to the top of this list.

### Fixed 2026-10-15

- **The category bar is missing for a currency with only one category** (owner, iPhone check of the redesign). The USD total had no breakdown because the bar was only drawn for two or more categories. Every currency now gets a bar. With one category the legend shows only the name, because the amount would repeat the headline figure. A category tab still shows no bar, because its heading already names the category.

### Deferred (with reasons)

| Item | Source | Why deferred |
|------|--------|--------------|
| Share an email straight from the mail app (Android Web Share Target) | LK | New feature. iPhone websites cannot appear in the share menu, and Android needs a home-screen install. Paste screenshot covers both phones now. |
| Forward-to-address email capture | LK (first request) | New feature, no inbound provider chosen (F2). Parked in `specs/todo/email-forward-capture.md`. |
| Contract end / minimum term field | LK's energy bill | New field and logic change. The Free trial toggle stops the misuse that came up. Parked in `specs/todo/installments-and-intervals.md`. |
| Installments | Owner | No tester has asked for it. Workaround: Yearly with a note. |
| German / English | Owner | Testers are fine in English (`specs/todo/i18n-de-en.md`). |
| Move the totals card up under Due soon | Owner (design idea) | No tester asked for it. Filtered totals would sit away from the filters. |
| Shorten the edit form and Settings | Owner | No tester has complained. Revisit if the second looks call them wordy. |
