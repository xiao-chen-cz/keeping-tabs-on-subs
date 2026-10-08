# Session Handoff - 2026-10-08

## Context
Short session after handoff 012 (work done late on Oct 7). Owner asked for clipboard paste of screenshots in capture, then for a confirmation screenshot on the cancel form (D12 proof). We also recorded Brevo support's answer on inbound email parsing (F2), which rules Brevo out.

## Completed
- **Paste a screenshot into capture** (`b5e6d9c`, pushed). ⌘V / Ctrl+V anywhere on `/capture` puts a clipboard image or PDF into the upload field, switching to the "Screenshot or PDF" tab if needed. Shows a thumbnail. Clipboard content with `text/plain` is left alone, so pasting email text still works. Clipboard files named `image.png` are renamed `pasted-screenshot.png`. Owner tested it in the browser: works.
- **Confirmation screenshot when cancelling** (`e2018f5`, pushed). Owner tested it end to end: works.
  - Shared pieces: `src/components/screenshot-field.tsx` (`ScreenshotField`: file input, dashed paste zone, thumbnail, Remove; `usePastedFile` hook for page-wide paste) and `src/lib/capture-upload.ts` (`uploadCaptureFile`: shrink to 1568 px, upload to `captures/<user_id>/<capture_id>.<ext>`). `capture-form.tsx` now uses both.
  - `cancel-form.tsx`: optional "Confirmation screenshot (optional)" field. Uploads on submit, then sends `captureId` + `mimeType` with the form. Reuses the same upload if the form comes back with validation errors. Takes a new `userId` prop (cancel page passes it).
  - `cancelSubscriptionAction` validates the id and type, then `saveProofCapture` (`src/lib/dal/captures.ts`) checks the file exists, its size and magic bytes, and inserts a `captures` row (`input = upload`, no extraction; a duplicate key from a retry is reused). The id goes to `set_subscription_status` via the existing `p_capture_id`.
  - **No migration needed:** bucket, `captures` table, `subscription_events.capture_id` and the RPC parameter already existed (migrations 20261006 and 20261011).
  - `countRecentCaptures` now counts only captures with an extraction or extraction error, so proof screenshots do not use the daily cap of 30.
  - Detail page: `captureFileLinks` signs the proof files; History shows a "Confirmation screenshot" (or "Confirmation (PDF)") link on its own line, opening in a new tab.
  - `specs/logic-spec.md` D12 updated. Tests: 340 pass (new history-link test; cancel-form tests pass `userId`). Lint and typecheck green.
- **Brevo F2 answered (uncommitted, see In Progress):** inbound parsing is Professional/Enterprise only; inbound mail, payloads and attachments are kept indefinitely with no deletion and non-expiring download tokens; EU processing not guaranteed. Recorded in `specs/todo/email-forward-capture.md` (Phase 0 notes, F2 row, status line, risks) and in the CLAUDE.md working note.

## In Progress
- `CLAUDE.md` and `specs/todo/email-forward-capture.md` have the Brevo notes **uncommitted**; owner had not yet answered "commit and push?". Commit them together with this handoff.

## Next Steps
1. **Commit and push** the Brevo notes and this handoff (after owner OK).
2. **Check the production deploy** of `e2018f5` on Vercel (not checked this session), then try a cancel with a pasted screenshot on production once.
3. Carry over from handoff 012: create tester accounts when the owner sends the emails (`pnpm create-account --email <tester> --set starter --out local-data/accounts.jsonl`); optional "Cloudly ... first year, then €11.99" capture check for `promo_ends`.
4. **Watch tester feedback:** capture wait time, phone photos, + New / ☰, and whether anyone asks for forwarding. Forwarding needs a new provider first (free or cheap at demo volume, deletes after delivery, EU only) or gets dropped.
5. Optional: mention in `docs/tester-guide.md` that a screenshot can be pasted (desktop) and that the cancel form takes a confirmation screenshot.

## Key Files
- `src/components/screenshot-field.tsx` - shared picker + paste zone + thumbnail, `usePastedFile`
- `src/lib/capture-upload.ts` - browser shrink and upload to Storage
- `src/components/capture-form.tsx` - uses the shared field
- `src/components/cancel-form.tsx` (+ `.test.tsx`) - confirmation screenshot field
- `src/app/(app)/subscriptions/actions.ts` - `cancelSubscriptionAction` saves the proof capture
- `src/lib/dal/captures.ts` - `saveProofCapture`, `captureFileLinks`, cap query change
- `src/app/(app)/subscriptions/[id]/page.tsx`, `src/components/subscription-detail.tsx` - History link
- `specs/todo/email-forward-capture.md` - Brevo ruled out (Phase 0 notes)

## Blockers / Notes
- **Phones:** a paste zone cannot receive images on iOS/Android; the file picker (photo library) covers mobile.
- **Proofs are only attachable while cancelling.** The event log is append-only, so there is no "add a screenshot later".
- Orphaned files are possible if someone uploads and then leaves the cancel form; `reset-account` removes the whole user folder after the test round.
- Dev server was started in the background this session (`pnpm dev`, port 3000); stop it if still running.
