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
| B1 | Model for extraction | Latest Claude Sonnet with vision (check the `claude-api` skill for the current id and price before coding). Only the capture is sent. |
| B2 | Anthropic API key | A server-only Vercel env var (`ANTHROPIC_API_KEY`). This is not the Supabase secret key, which stays off Vercel. |
| B3 | File storage | Private Supabase Storage bucket `captures` (EU), path `<user_id>/<capture_id>.<ext>`, storage RLS on the first path segment. Max size 10 MB; png, jpg, webp, pdf. |
| B4 | Cost and abuse guard | A per-user daily cap on extraction calls (e.g. 30), counted in `captures`. |

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

## 5. Part B build steps (outline, detailed after Part A)

1. `/capture` with three tabs: Describe (textarea), Upload (file input with camera on phones), Paste (textarea).
2. Server action: create the capture row (and the storage upload), then call extraction, then create the proposal, then redirect to `/review/[id]`.
3. `src/lib/extraction/`: the prompt with logic-spec §4 rules, a JSON schema via tool use or structured output, and zod-validated output. Null for anything not found; never guess dates or prices; card numbers are never kept.
4. Tests: the prompt and schema against the 4 sample captures, using recorded fixtures (no live calls in CI), plus one manual live run.
5. Sample captures: write `seed/captures/*` (NoteForge screenshot, CodePilot receipt text, Gymbox sparse PDF, ReadLoop trial email). All fictional.

## 6. Cut order

From the brief: if behind, the question UI falls back to highlighted form fields. Part A without the RPC is not acceptable (risk of duplicates); keep the RPC.
