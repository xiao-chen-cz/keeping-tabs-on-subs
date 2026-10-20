# Explainer video: script (draft, D26)

About 90 seconds, phone format (1080 × 1920). Captions carry the story, so it works muted (first sign-in) and with an optional voiceover (submission). Every screen comes from `/demo` or a demo account on the fictional full set. Never the owner's real data.

Built with HyperFrames (HTML/CSS scenes rendered to MP4). Screens are phone-width screenshots of `/demo` (390 px). One optional real iPhone clip in scene 3.

| # | Time | On screen | Caption (and voiceover) |
|---|------|-----------|-------------------------|
| 1 | 0–6 s | Title card: app icon, "Keeping Tabs on Subs". A receipt slides in: "Your plan renewed: 120.00 USD". | **Subscriptions don't remind you. They renew.** |
| 2 | 6–13 s | Split card: a bank statement line (paid, past) vs. a cancel-by date (still open). | **A bank shows what you paid. This shows what you can still stop.** |
| 3 | 13–30 s | Capture screen with the three tiles (Text, Upload, Paste screenshot). Then, in turn: typed sentence "Notion Plus, 8 EUR a month, renews on the 15th"; a receipt screenshot pasted; a PDF invoice. Optional: 5 s real iPhone clip, screenshot → Share → Paste screenshot. | **Add a subscription in one step: type a sentence, paste a screenshot, or upload a receipt.** |
| 4 | 30–46 s | Review queue. P1 NoteForge: fields filled, the billing-cycle question highlighted. Then P2 CodePilot Pro: "Update: 20.00 → 25.00 USD" in red. | **AI reads it and proposes an entry. It never guesses: anything missing becomes a short question.** / **Already tracked? It proposes an update and shows the price change.** |
| 5 | 46–52 s | Thumb taps Approve. Entry drops into the list. | **Nothing is added until you approve it.** |
| 6 | 52–66 s | The list. Zoom on Due soon with cancel-by dates. Then quick highlights: Trial (StreamBox Prime), Needs update (PixelStock), Ending (FitClub Online), price rise (VoiceDraft Pro 120 → 200 USD). | **Sorted by what you must act on first, with the date to cancel by.** / **Trials, price rises and ending plans are flagged.** |
| 7 | 66–78 s | Alert email mock-up: "Cancel by Friday: The Daily Ledger". Two buttons: Keep, Cancelled. Then the cancellation log entry. | **Reminders 3, 1 and 0 days before the deadline. One tap: keep it, or mark it cancelled, with proof logged.** |
| 8 | 78–85 s | Three small badges: EU flag, lock, "invite-only". | **EU-hosted, invite-only, and the AI sees only the capture it reads.** |
| 9 | 85–90 s | Phone Home Screen with the app icon. End card: app name and tagline. | **Know what renews, and cancel in time.** |

## Notes
- Scene 3's typed example is generic on purpose; replace it with a seed name if a real brand looks odd ("NoteForge Plus, 12 USD a month…").
- Scene 7's email is a mock-up built in HTML from the real alert template, with seed data.
- For first sign-in: same video, with a Skip button; it plays before the tour (`src/app/(app)/tour-actions.ts`).
- Contact sheet: 9 frames, one per scene, captions underneath, one image (for the proof upload; the AI review cannot watch video).
