# Session Handoff - 2026-10-20

## Context
D26 (Tue). Planned: final submission draft and proof. Done: the submission draft, a privacy check of Mistral, and (pulled forward from Wed/Thu) the full explainer video with voiceover. Also settled how the owner can use the app with real data after the challenge.

## Completed
- **Final submission draft** in `local-data/submission-draft.md` (gitignored). The form has two fields: "What did you ship?" (prompts: what works, who uses it, what was tested, what is still manual) and a link. Link: `https://keeping-tabs-on-subs.vercel.app/demo`. The text is public in the Community tab, so fictional data only and testers by count, not initials. The owner thinks a saved submission cannot be edited, so the plan is to **submit once on Fri 23**.
- **Mistral privacy checked** in the admin console: training on API calls is off, Labs models off. Retention is 30 rolling days for abuse monitoring; zero data retention is on request only. Handoff 024 line 72 updated (`6c9e31f`). Account details are in `local-data/private-notes.md`.
- **Claude fallback key removed** from Vercel by the owner (`ANTHROPIC_API_KEY`), so captures cannot leave the EU by a switch flip.
- **D26 check-in** drafted and posted by the owner (Mistral check, key removed, Home Screen install, Keep vs Keep quietly left for testers, submission drafted).
- **Home Screen install** done by the owner on iPhone via Chrome (Share → Add to Home Screen). No web app manifest added (offered, not wanted). iOS lets each user pick the label, so the app's suggested name stays "Keeping Tabs on Subs".
- **Keep vs Keep quietly** (dashboard's D26 task): the owner decided no small wording change fixes it; it stays parked for testers (`specs/todo/keep-vs-quiet.md`).
- **Explainer video, first full version** (`docs/video/`, not committed):
  - `script.md` (committed in `6c9e31f`): 9 scenes, captions.
  - `keeping-tabs-explainer.mp4`: 63 s, 1080 × 1920, captions plus voiceover, 9.6 MB.
  - `contact-sheet.png`: 9 frames in a 3 × 3 grid, for the proof upload (replaces the AppSheet screenshot).
  - `source/`: HyperFrames composition `index.html`, `/demo` screenshots in `shots/`, voice clips in `vo/`, `voiceover.tsv` (13 lines with timings), `tts.py` (local Kokoro voice script).
  - List and review screens are real `/demo` screenshots (390 px, 3×). The capture screen and the alert email are HTML mock-ups in the app's colours and fonts.
  - Voiceover: Kokoro-82M run locally, voice `af_heart`. Scenes were retimed to the voice (90 s → 63 s); pauses between lines are now 0.3–0.9 s, except 1.4 s in the capture scene and 1.5 s at the end. The owner approved the first voiced version apart from the long pauses, which this fixed.

## In Progress
- `docs/video/` is uncommitted (video, contact sheet, source). Proposal: commit `source/` and `contact-sheet.png`; keep the 10 MB MP4 out of git (or put it in `public/` only if it plays inside the app).
- The owner has not yet watched the tightened 63 s version.

## Next Steps
1. **Owner watches the 63 s video** and names any line, pause or scene to change. Re-render takes about 40 s.
2. **Commit `docs/video/source/` and `contact-sheet.png`** (privacy scan first). Decide where the MP4 lives.
3. **Thu 22: upload the contact sheet** as proof (replaces the AppSheet screenshot; slots are capped at 10). Mention in that day's check-in what the video shows, since the AI review cannot watch it.
4. **Optional: show the video on first sign-in**, before the tour (`src/app/(app)/tour-actions.ts`), with a Skip button. Plays muted, captions carry it.
5. **Real data after the video** (Thu or Fri), in this order: `check-rls` while testers are still active (or remove testers first: `reset-account` per tester, then delete the user); create a new owner account (not the demo account, which gets reseeded); add own subscriptions by capture and keep a private tally of clean extractions in `local-data/`; update CLAUDE.md and README ("the owner's own account in the hosted instance; never in the repo, demo, screenshots or video").
6. **Update the submission draft**: "Who uses it" once real data is in (count and extraction result, no subscription names), and one line describing the video. Copy it to the clipboard with `pbcopy`, then the owner submits **Fri 23**.
7. Daily check-ins D27–D29 (owner).
8. Optional: Sentry (EU); second-look message to JB/RG with the Keep vs Keep quietly question.

## Key Files
- `local-data/submission-draft.md` - final submission text and link (gitignored)
- `local-data/private-notes.md` - Mistral plan and privacy findings (gitignored)
- `docs/video/script.md` - video script
- `docs/video/source/index.html` - HyperFrames composition (scenes, GSAP timeline, retime map `OLD`/`NEW`, audio tags)
- `docs/video/source/voiceover.tsv`, `tts.py`, `vo/` - narration lines, voice script, clips
- `docs/video/keeping-tabs-explainer.mp4`, `contact-sheet.png` - outputs
- `specs/todo/keep-vs-quiet.md` - parked UX question

## Blockers / Notes
- **Rebuilding the video:** copy `docs/video/source/` to a scratch folder, then `npx hyperframes check` and `npx hyperframes render -q high -o out.mp4` (v0.8.181, telemetry disabled). Do not use `hyperframes publish` (uploads) or `capture` / `snapshot --describe` (send images to an AI service).
- **Regenerating voice lines:** needs a Python 3.12 venv with `kokoro-onnx` and `soundfile` (`uv venv -p /opt/homebrew/bin/python3.12`, `uv pip install kokoro-onnx soundfile`) and Homebrew `espeak-ng` (installed by the owner this session). The pip `espeakng-loader` build is broken on macOS (hard-coded data path), so `tts.py` points at `/opt/homebrew/lib/libespeak-ng.dylib` and `/opt/homebrew/share/espeak-ng-data`. Model files are in `~/.cache/hyperframes/tts/`. Usage: `python tts.py "<text>" af_heart out.wav`. After changing a line, re-check that it fits its slot in `voiceover.tsv`.
- **Dates in the video go stale:** the `/demo` screens show cancel-by dates relative to Oct 20. Re-capture and re-render on Fri only if the dates matter.
- **Text for web forms** goes to the clipboard as plain text (`pbcopy`), never as a quoted block (the terminal's quote bar gets copied).
- If extraction ever starts failing, check the Mistral spending limits first (details in `local-data/private-notes.md`).
- Only fictional seed data in the video, screenshots and contact sheet.
