# Session Handoff - 2026-10-18

## Context
Daily challenge D24 (Sunday). The roadmap task was to check email screenshot capture end to end on an iPhone. The rest of the session planned the last six days before the submission on Sat 2026-10-24 (D30): (1) what would make the owner use Keeping Tabs on Subs instead of a bank-linked app like Finanzguru, (2) a grader account anyone can sign in to, (3) a video walkthrough.

## Completed
- **D24 iPhone check passed** (owner, sample data): opened a subscription email → screenshot → copy → Paste screenshot → review → approve. It worked end to end, with no blocker and no new friction. Recorded in `docs/tester-round.md` → "Verified 2026-10-18 (D24)". This closes fix list item 3.
- **JB:** the owner followed up again; no feedback yet.
- **Decisions for the final week** (below).

## Decisions
- **Item 1 = Mistral extraction, mainly for EU data residency** (Mistral is hosted in the EU). Build it behind a switch: `EXTRACTION_PROVIDER=claude|mistral`. Claude stays the default for the demo and grader unless Mistral matches it on the sample captures.
  - The brief and CLAUDE.md name "Claude API for extraction". If Mistral becomes the default, update both and say so in the submission.
  - Cost does not decide it. At ~20–30 captures a month, Claude Opus 5.5 at low effort is ~$0.03–0.05 per capture (~€1/month). Mistral Medium 3.5 ($1.50/$7.50 per 1M) is ~$0.01, Mistral Small 4 ($0.15/$0.60) ~$0.001. These prices come from third-party pages; check them on mistral.ai.
  - The owner has put `MISTRAL_API_KEY` in `.env.local`. Claude cannot read that file (deny rule), so the first test call will confirm the key works.
  - Alternative noted but not chosen: Claude on Google Vertex AI in an EU region (needs GCP setup).
- **Other ideas for item 1, not chosen:** a calendar feed (ICS) of cancel-by dates, a "saved so far" figure from the cancellation log, and many subscriptions from one screenshot (iOS Subscriptions list, PayPal automatic payments). The pitch line for the video: "a bank shows what you paid; this shows what you can still stop" (trials, cancel-by, notice periods and annual renewals are invisible to bank data).
- **MK's tip 1 (session monitoring):** add error monitoring and masked session replay, so problems testers don't report still show up. The pick is Sentry (EU region, Frankfurt; replay masks all text and inputs by default). Optional, on Tue with the grader account. Testers must be told ("the app records clicks and errors, no text or amounts").
- **MK's tip 2 (explainer video):** a 1–2 minute explainer made with HyperFrames (HeyGen's open-source tool that renders HTML/CSS scenes to MP4, made for coding agents), built from `/demo` sample-data screenshots. Show it on first sign-in, before the existing first sign-in tour (`src/app/(app)/tour-actions.ts`). The same video is the core of the submission video. Maybe add a short real iPhone screen recording.

## Schedule
| Day | Focus |
|---|---|
| Mon 19 (D25) | Mistral adapter behind the switch; compare against Claude on `seed/captures/` |
| Tue 20 (D26) | Grader account + "how to try it" note (`specs/todo/grader-demo-account.md`); Sentry if time |
| Wed 21 (D27) | HyperFrames explainer: script and first render |
| Thu 22 (D28) | Polish the video, show it on first sign-in before the tour, optional iPhone screen recording |
| Fri 23 (D29) | Buffer: tester feedback, fixes |
| Sat 24 (D30) | Reseed the grader account (`pnpm reset-account --email grader@example.com --set full`), submit |

## In Progress
- Nothing in code.

## Next Steps
1. **Mistral (Mon):** check Mistral's current docs first: image input as base64, JSON-schema structured output, and how it handles PDFs (direct, or OCR first). Then add `src/lib/extraction/mistral.ts` with the same `extractCapture(capture, today, categories)` signature and `ExtractionResult` type as `src/lib/extraction/claude.ts`. Pick the provider in `src/app/(app)/capture/actions.ts:14`. Reuse `EXTRACTION_SYSTEM`, `extractionUserContent` and `extractionSchema` (Zod → JSON schema). Keep the "return null, never guess" rule.
2. Run both providers on all four `seed/captures/` (readloop text, noteforge PNG, codepilot text, gymbox PDF) and compare field by field. Try Mistral Medium 3.5 and Small 4. Add unit tests for the adapter (mock the client), as for the Claude adapter.
3. Record the provider choice in `specs/logic-spec.md` / CLAUDE.md, and add `MISTRAL_API_KEY` and `EXTRACTION_PROVIDER` to the Vercel env when it goes live.
4. Grader account per `specs/todo/grader-demo-account.md`, then optional Sentry.
5. The second-look message for JB and RG is still not drafted. Draft it if they're still expected to respond; mention session recording if Sentry is live.

## Key Files
- `src/lib/extraction/claude.ts` - current provider adapter (the only one)
- `src/lib/extraction/prompt.ts`, `schema.ts`, `to-draft.ts` - provider-neutral prompt, schema and mapping
- `src/app/(app)/capture/actions.ts` - the only caller of `extractCapture`
- `seed/captures/` - the four sample captures for comparison
- `specs/todo/grader-demo-account.md` - grader account plan
- `docs/tester-round.md` - D24 result

## Blockers / Notes
- Only fictional seed data goes into the video, screenshots and HyperFrames scenes.
- Mistral is a scope change from the brief ("Claude API for extraction"); keep Claude as the default until the comparison is done.
