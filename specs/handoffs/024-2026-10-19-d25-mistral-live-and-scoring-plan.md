# Session Handoff - 2026-10-19

## Context
D25 (Mon). Planned task: move extraction from Claude to Mistral for EU data residency. Done and live. The rest of the session was about a UX confusion (Keep vs Keep quietly) and re-planning the last five days around how the challenge is scored (score 75/100, rank 3 of 35).

## Completed
- **Extraction on Mistral, live in production** (`57817b0`):
  - `src/lib/extraction/mistral.ts`: Mistral Medium 3.5, pinned `mistral-medium-2604`, plain `fetch`, strict JSON schema from `extractionSchema`. Images go as `image_url` data URLs, PDFs as `document_url` data URLs (no OCR step). One retry on 429/5xx/dropped connection. Same user-safe error strings as `claude.ts`. `MISTRAL_MODEL` env overrides the model (for comparisons).
  - `src/lib/extraction/extract.ts`: `ExtractionResult` type and the provider switch. Default `mistral`; `EXTRACTION_PROVIDER=claude` switches back. Called by `capture/actions.ts` and `scripts/extract-live.ts`.
  - `prompt.ts`: `extractionUserText` is shared by both providers. Two prompt lines made clearer: `is_subscription` is false only when the capture is clearly not recurring (a membership fee counts), and scope is never null.
  - Comparison on the six samples at today = 2026-10-02:
    - Small 4 (`mistral-small-2603`): rejected, it filled cycles and next-charge dates the captures don't state.
    - Medium 3.5: after the prompt fix, matches Claude on all required fields and on scope. Differences are only category choice and confidence. Mistral takes 1.5–2.5 s per call.
    - Claude was rerun with the new prompt: no regression. It dropped the "nothing stated" notes the prompt forbids, so its fixtures were re-recorded.
  - Fixtures: `src/lib/extraction/fixtures/mistral/*.json`. `to-draft.test.ts` runs the sample-capture checks for both providers (`describe.each`). New tests: `mistral.test.ts` (request, parsing, errors, retry, switch) and a provider note test in `capture-form.test.tsx`. 393 tests pass; tsc, lint and `pnpm build` are clean.
  - The capture form note names the active provider: "Mistral AI (in the EU)" or "Anthropic's Claude (outside the EU)".
  - Docs updated: CLAUDE.md (stack, EU line), README, the brief, `docs/tester-guide.md`, logic-spec §4 rule 11.
  - Vercel: the owner added `MISTRAL_API_KEY` (Production). `ANTHROPIC_API_KEY` is kept for the switch.
- **Deploy incident:** a dashboard "Redeploy" of the old commit `337e1d2` ran at the same moment as the push and finished last, so it took the production alias. The owner promoted `n00z16m5f` (commit `57817b0`) with `vercel promote`. Verified with `vercel inspect keeping-tabs-on-subs.vercel.app`. The owner then confirmed in the browser: the note says Mistral and a capture worked.
- **Keep vs Keep quietly parked** (`8976ac0`): `specs/todo/keep-vs-quiet.md`, plus a row in `docs/tester-round.md` → Deferred.
  - Trigger: EuroServer was Kept, so it was missing from Due soon, but the list showed no marker; Cloudly shows a Quiet pill.
  - Option A: rename to "Let it renew" / "Mute reminders" and add a Renewing pill. Proposed, not chosen.
  - Option B: drop the one-renewal Keep and keep only the lasting quiet setting. The owner leans this way.
  - Ask testers before deciding.
- **Grader account dropped** (`specs/todo/grader-demo-account.md`, uncommitted): the AI review cannot open links. Mark gets `/demo`.
- D25 check-in text drafted for the owner (the owner posts it). It includes the required "what I tested / result / what's still done by hand" sections.

## Scoring facts (from the challenge dashboard, 2026-10-19)
- **Shipped: 8/25, capped until the final submission is saved.** 17 points open up only when it is saved. The form is open now. "A private tool you actually use counts as shipped."
- **Showing up: 23/30.** Log D25–D29 (0.8 points each); 3 points for past days are lost.
- **Proof of work: 19/20.** Hint: add one more kind of proof, and name in the check-in what was tested, the result and what is still done by hand.
- **Building in public: 25/25.**
- The AI review reads only check-ins, proof items and uploaded screenshots. It cannot open links, watch videos or read linked documents. Mark confirms the winners himself.

## Next Steps
1. **Final submission:** the owner pastes the form's fields and Claude drafts the answers. Find out whether a saved submission can still be edited. If yes, save a solid version on D25/D26 and refine it; if no, finish it by Wed 21.
2. **New kind of proof:** a screenshot of the test run ("393 passed") and/or a rendered Mistral vs Claude comparison table to screenshot. The field differences are in this handoff and in logic-spec §4.11.
3. **Daily check-ins D26–D29** (owner).
4. **HyperFrames explainer video (Wed–Thu), kept as the owner's own challenge and for Mark:**
   - Use fictional `/demo` data only.
   - Also render a **contact sheet** (6–9 captioned key frames in one image) as a scoreable screenshot.
   - Describe the video in that day's check-in.
5. Optional: Sentry (EU), and the second-look message for JB/RG. Add the Keep vs Quiet question from `specs/todo/keep-vs-quiet.md` to it.
6. Commit the grader-plan change and this handoff.

## Revised schedule
| Day | Focus |
|---|---|
| Mon 19 (D25) | Done: Mistral live. Check-in posted by the owner. |
| Tue 20 (D26) | Final submission draft + extra proof screenshots |
| Wed 21 (D27) | HyperFrames script and first render |
| Thu 22 (D28) | Video polish, contact sheet, show it on first sign-in before the tour |
| Fri 23 (D29) | Buffer: tester feedback, submission polish |
| Sat 24 (D30) | Submit (deadline) |

## Key Files
- `src/lib/extraction/mistral.ts`, `extract.ts`, `claude.ts`, `prompt.ts` - providers, switch, shared prompt
- `src/lib/extraction/fixtures/mistral/` - recorded Mistral outputs (today 2026-10-02)
- `src/lib/extraction/to-draft.test.ts`, `mistral.test.ts` - provider parity and adapter tests
- `scripts/extract-live.ts` - `EXTRACTION_PROVIDER` / `MISTRAL_MODEL` aware live run
- `specs/todo/keep-vs-quiet.md` - parked UX question
- `specs/todo/grader-demo-account.md` - marked DROPPED
- `src/app/demo/` - public read-only demo for Mark

## Blockers / Notes
- **Don't press Vercel's "Redeploy" after changing env vars when a push follows:** the push already builds with the new vars, and two builds race for the alias. Claude Code cannot run `vercel promote` (auto-mode classifier: production deploy); the owner runs it with `!`.
- Mistral retention period not verified. The UI only claims "in the EU". Mistral processes API data in the EU by default and does not train on API content unless you opt in.
- Mistral prices in handoff 023 come from third-party pages; not checked on mistral.ai.
- Only fictional seed data goes into the video, screenshots and contact sheet.
