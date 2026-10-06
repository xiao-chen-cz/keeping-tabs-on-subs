# Plan: D16–20 capture, extraction and review queue

Created 2026-10-03 (night) · **DRAFT, needs owner review before any migration** · Milestone D16–20 (Oct 10–14) · Source of truth: Demo Build Brief, `specs/logic-spec.md` §4, `specs/seed-data.md` (P1–P3)

## 1. Why split in two parts

The challenge card D17 asks for a review flow on a manually entered proposal, and a first tester could come around Oct 9–10. So the plan has two parts:

- **Part A (pull forward, Oct 5–8):** schema for captures and proposals, seeded proposals P1–P3, the review screen (approve / edit / reject), the missing-field questions, and the update-not-duplicate match. There is no model call yet: proposals come from the seed or from a "paste a proposal" dev form.
- **Part B (Oct 10–14, as the brief planned):** capture inputs (typed description, upload screenshot/PDF, paste email text), storage, and the extraction call that turns a capture into a proposal.

The minimum demo in the brief ("typed description or upload/paste plus review queue with questions") needs both parts.

## 2. Decisions for the owner (morning)

| # | Question | Recommendation |
|---|---|---|
| A1 | Pull Part A forward to Oct 5–8? | Yes. It closes card D17 before a D15 tester, and the domain and form code is ready. |
| A2 | Approve as one transaction (insert or update subscription, then mark the proposal approved) | A Postgres function `approve_proposal(proposal_id, fields jsonb)` with `security invoker`, so RLS still applies. Two separate calls could leave a subscription without an approved proposal. |
| A4 | Cancellation record (D12, added 2026-10-04) | In the Part A migration: append-only `subscription_events`. The cancel flow asks for date, channel and an optional reference. See §3 and step 7. |
| A3 | A stated next renewal date in a capture | Store it as `lastRenewalDate` (a future anchor, D4 rule 3). Decided overnight, see `specs/subscription-rules.md`. The brief allows "next renewal" as the one required date. |
| B1 | Model for extraction | **Decided 2026-10-06:** `claude-opus-5-5` (vision + PDF, structured output), low effort, via the Anthropic API directly (about $0.05 per capture). Only the capture is sent. The API offers no EU inference geography (`us`/`global` only); EU-only would mean Bedrock Frankfurt, which was not chosen. The capture leaves the EU for the model call only, and the privacy notice says so. |
| B2 | Anthropic API key | **Decided 2026-10-06:** the owner creates a key in a dedicated Console workspace with a monthly spend limit and sets it as a server-only Vercel env var (`ANTHROPIC_API_KEY`) and in `.env.local`. Never in chat or git. This is not the Supabase secret key, which stays off Vercel. |
| B3 | File storage | **Decided 2026-10-06 as recommended:** private Supabase Storage bucket `captures` (EU), path `<user_id>/<capture_id>.<ext>`, storage RLS on the first path segment. Max size 10 MB; png, jpg, webp, pdf. |
| B4 | Cost and abuse guard | **Decided 2026-10-06 as recommended:** 30 extraction calls per user, counted in `captures`. Built as a rolling 24 hours (no time-zone boundary to compute; same effect for abuse). |

## 3. Schema (one migration per part)

**Part A** `…_review_queue.sql`
- Enum `capture_status` (`pending`, `approved`, `rejected`). Enum `capture_input` (`text`, `upload`, `paste`, `seed`). Extend `entry_source` with `capture`.
- `captures`: `id`, `user_id`, `input capture_input`, `raw_text text`, `storage_path text`, `mime_type text`, `received_at timestamptz`, `extraction jsonb` (raw model output, kept for the "what the model read" link), `extraction_error text`.
- `proposals`: `id`, `user_id`, `capture_id` (composite FK with user_id), `status capture_status default 'pending'`, every draft field from `SubscriptionDraft` (all nullable, including `name`), `field_confidence jsonb`, `updates_subscription_id` (composite FK), `subscription_id` (the row created or updated on approval), `decided_at`.
- `subscriptions.capture_id` (nullable composite FK): the "link to original capture".
- `subscription_events` (D12): `id`, `user_id`, `subscription_id` (composite FK), `kind` enum (`cancelled`, `reopened`), `occurred_on date not null` (when it happened with the vendor), `channel` enum (`website_app`, `email`, `phone`, `letter`, `in_person`, `other`, required for `cancelled`), `reference text`, `note text`, `capture_id` (optional composite FK, the confirmation), `recorded_at timestamptz default now()`. RLS: select and insert only (no update or delete policies, no grants for them), so the log is append-only for users.
- RLS and grants exactly like the core tables, and `check-rls` extended to both new tables.

**Part B** `…_capture_storage.sql`: the bucket plus storage policies.

## 4. Part A build steps

1. Pure: `src/lib/domain/proposal.ts` with `missingRequired(draft)` (reuses `REQUIRED_FOR_APPROVAL`) and `matchExisting(draft, subscriptions)` (vendor or name plus amount and currency, case-insensitive, returns the candidate id). Tests: the P1 / P2 / P3 shapes from seed-data.md.
2. Pure: `questions.ts` holds the fixed questions per missing field (cycle shows 4 tappable options; currency shows the enum; amount, name and date get typed inputs). The model never invents the question. A free-text answer is parsed by code where possible (amounts, ISO dates); a model parse comes only in Part B.
3. Seed: P1 for starter, P1–P3 for full, with the sample capture texts. `buildSeed` returns proposals too, and the account scripts insert them.
4. UI: a "Review (n)" entry on the list, `/review` (the queue), and `/review/[id]`. The review screen shows each field with its confidence flag and "Looks like <existing subscription>" when matched. It asks the questions first, then shows the pre-filled form (the edit form doubles as manual add, per the brief), with Approve / Reject.
5. Actions: `approveProposal` (validated with `parseSubscriptionForm(..., 'create')`, then the RPC), `rejectProposal`. Nothing reaches the list without approval.
6. Tests: pure tests, RTL for the review screen (questions appear only for missing fields; Approve is blocked until they are answered), `check-rls` for the new tables.
7. Cancellation record (D12): when the status changes to Cancelled (edit form now, the one-tap Cancelled from an alert in D21–23), ask for "Cancelled on" (default today), "How" (channel) and an optional reference and note. Insert the event in the same RPC as the status change (`set_subscription_status`), so a status change can never happen without its record. Reopening inserts a `reopened` event. The detail page shows "Cancelled on 4 Oct 2026 via Website / app, ref ABC-123". Tests: pure validation (channel required, date not in the future), RLS (cannot update or delete events, cannot write another user's), RTL (the history renders).

**Done when:** cancelling a subscription in the edit form records date and channel, and the detail page shows it; the starter account shows 1 proposal (NoteForge); answering the category question and approving adds it to the list; rejecting P3 leaves the list unchanged; approving P2 updates CodePilot Pro's last renewal instead of creating a duplicate.

## 5. Part B build steps (detailed 2026-10-06)

Decisions made while detailing (decide-and-log, owner can overturn):

| # | Decision | Why |
|---|---|---|
| B5 | The browser uploads the file straight to Storage (user session, storage RLS); the server action gets only the path. | Server actions accept 1 MB by default and Vercel functions 4.5 MB; a 10 MB PDF would not fit through the action. |
| B6 | Images are downscaled in the browser to at most 1568 px on the long edge (JPEG) before upload. PDFs go as they are (max 10 MB). | Claude scales larger images down anyway, the API limit per image is 5 MB, and phone photos are often bigger. Cheaper and faster. |
| B7 | The capture row is inserted once, after the model call, with `extraction` / `extraction_error` filled in. The client picks the capture id (UUID) so the storage path `<user_id>/<capture_id>.<ext>` exists before the row. | `captures` has no update grant, and this keeps it that way. |
| B8 | The model gets the capture, today's date (user time zone) and the category names. Never payment method nicknames, other subscriptions or the account email. Payment method and scope evidence that needs user data is resolved by code after the call. | CLAUDE.md: the LLM call sends only the capture being extracted. |
| B9 | Payment method: the model returns the label it sees; code keeps it only when it equals one of the user's payment method nicknames (case-insensitive). Anything else (card brands, last digits, IBANs) is dropped. | §4 rules 7 and 8. |
| B10 | Code, not the model, enforces: enums, ISO dates, amounts with at most 2 decimals, regular price and promo end both or neither, http(s) cancel URLs, overall confidence = lower of category and scope (§4 rule 6). A stated next charge becomes `lastRenewalDate` (A3); a stated last charge wins over it. | Never trust model output for rules we can check. |
| B11 | A failed or refused call still creates the capture (with `extraction_error`) and an empty proposal, so the user can fill it in or reject it. Failed calls count toward the daily cap. | Manual entry is the fallback; nothing is lost. |
| B12 | Free-text answers to the missing-field questions stay parsed by code (`parseAnswer`); a model parse is deferred until testers show it is needed. | Tappable options and date / amount inputs already cover the fixed questions. |

Steps:

1. **Migration** `…_capture_storage.sql`: private bucket `captures` (10 MB, png / jpeg / webp / pdf), storage policies select / insert / delete for `authenticated` where the first folder of the object name equals `auth.uid()`. No update policy. `check-rls` extended: another user cannot read, write or list a file.
2. **Pure extraction module** `src/lib/extraction/`:
   - `schema.ts`: zod schema of the model output (every field nullable, plus per-field confidence).
   - `prompt.ts`: the system prompt from logic-spec §4 and the user content blocks (text, image or PDF document) with today's date and the category list.
   - `to-draft.ts`: model output → `SubscriptionDraft` (rules B9, B10), then `matchExisting` sets `updatesSubscriptionId`.
   - `limits.ts`: daily cap (30, Berlin day), accepted MIME types and size.
   - Tests on recorded model outputs for the four sample captures plus bad output (card number, one-sided promo, unknown currency, javascript: URL, impossible date). No live calls in CI.
3. **Server side** `src/lib/extraction/claude.ts` (server-only): `@anthropic-ai/sdk`, `claude-opus-5-5`, `effort: "low"`, `messages.parse` with `zodOutputFormat`, `max_tokens` 4000, typed error handling, a refusal or parse failure becomes `extraction_error`. `maxDuration` 60 s on the route.
4. **DAL + action** `createCaptureAction` (in `src/app/(app)/capture/actions.ts`): require user → check the cap → for uploads check that the path is in the user's folder and download the file → call extraction → insert capture and proposal → redirect to `/review/[id]`. A shared `draftToProposalInsert` (generalised from the seed's `seedProposalToInsert`).
5. **UI** `/capture`: three tabs (Describe, Upload or photo, Paste email), one submit, a pending state "Reading your capture…" (about 10–20 s). The list's Add button goes to `/capture`; "Enter it yourself" links to `/subscriptions/new`. The review and detail pages show an uploaded image or PDF through a short-lived signed URL; text captures as before.
6. **Sample captures** `seed/captures/`: NoteForge billing page (PNG), CodePilot receipt (text), Gymbox invoice (sparse PDF), ReadLoop trial email (text). All fictional, generated by a script so they can be redrawn.
7. **Live check** `pnpm extract:live <file>`: one real call per sample capture, run by hand (about $0.05 each), output compared with the recorded fixture.
8. **Resets:** `reset-account` also deletes the user's files in `captures`.

**Done when:** on the phone, a typed "ReadLoop 6.99 EUR a month, trial ends …" lands in the review queue as a Trial proposal; uploading the NoteForge PNG asks only the billing-cycle question; pasting the CodePilot receipt proposes an update with a price change; the Gymbox PDF yields name and amount only; a 31st call within 24 hours is refused with a clear message; nobody can open another user's file.

## 6. Cut order

From the brief: if behind, the question UI falls back to highlighted form fields. Part A without the RPC is not acceptable (risk of duplicates); keep the RPC.
