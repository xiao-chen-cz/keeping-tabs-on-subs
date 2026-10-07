# Plan: forward an email to capture a subscription

Created 2026-10-06 · **PARKED (2026-10-07): build only if testers ask for it; not offered in the tester guide or the app.** F1 and F3 approved; F2 open (see Phase 0 notes); F4 open · Builds on D16–20 Part B (`specs/todo/d16-20-capture-and-review.md`) · Not a brief milestone: extra scope, after the first tester round has started.

## 1. Problem and goal

Today a subscription arrives by typing, upload or paste. Receipts and renewal notices mostly arrive by email, and copying the text out on a phone is clumsy. Goal: each user has a private address; forwarding an email there produces a proposal in their review queue, through the same extraction and review as paste. Nothing reaches the list without approval.

Not in scope (unchanged): reading anyone's mailbox (Gmail / O365 OAuth), auto-replies, scanning a whole inbox, bank or card data.

## 2. Decisions

Owner decisions (Phase 0):

| # | Question | Recommendation |
|---|---|---|
| F1 | Lift "forward-to-address email capture" from CLAUDE.md *Out of scope* and add it to the brief as an extra after D24? | Yes, as optional scope. The minimum demo is already met. |
| F2 | Inbound provider | Brevo inbound parsing ([docs](https://developers.brevo.com/docs/inbound-parse-webhooks)): already our sender, EU company, delivers parsed JSON (text, HTML, attachments) to a webhook. This resolves the CLAUDE.md open question "inbound-email provider". Must be confirmed in Phase 0: available on the free plan, and how long Brevo keeps inbound mail. |
| F3 | Receiving domain | A new subdomain `in.<owner domain>` (Brevo requires a different subdomain from the sending one, `alerts.`). The owner adds the MX records at the DNS host. Resolves the CLAUDE.md open question "capture domain". |
| F4 | Who may send | Only mail whose sender (From) is the account's own email address, sent to that account's private address. Anything else is dropped and logged (count only, no content). Testers' accounts are created with their real email, so their own forwards pass. Can be loosened later to a per-user list of extra senders. |

Decided while planning (decide-and-log, owner can overturn):

| # | Decision | Why |
|---|---|---|
| F5 | Address per user: `s-<token>@in.<domain>`, token 12 random base32 characters in `profiles.inbound_token` (unique). Created and rotated only by an RPC `rotate_inbound_address()`; users cannot write the column directly. Settings shows it with Copy and "New address". | Unguessable; a leaked address can be replaced; the sender check (F4) is the second lock. |
| F6 | The webhook is a Supabase Edge Function `receive-email` (like `send-alerts`), JWT check off, secret in the URL path checked in constant time. It uses the service role, which never reaches Vercel. | It runs without a user session, so it needs elevated rights; those stay in Supabase (CLAUDE.md). |
| F7 | Extraction runs in the Edge Function right away, using the app's pure extraction code via a bundle (the `pnpm bundle:alerts` pattern) and the Anthropic SDK through `npm:`. `ANTHROPIC_API_KEY` becomes an Edge Function secret too (a second key in the same Console workspace, so it can be revoked separately). Fallback if bundling the SDK fails: store the capture as "unread" and run the extraction in Next on the next app open. | The proposal is ready when the user opens the app. The rules stay in one place. |
| F8 | New `capture_input` value `email`. Stored: subject, sender, date and the plain text body in `raw_text`; up to 2 attachments (pdf / png / jpeg / webp, ≤ 10 MB each) in the `captures` bucket under the user's folder. One extraction call gets the text plus those attachments. | Same storage and review as upload; "What the app read" shows the email and its attachments. |
| F9 | Use the raw text body (`RawTextBody`, else the HTML body converted to text), not Brevo's `ExtractedMarkdownMessage`. | The cleaned-up message may drop the quoted, forwarded part, which is the part we need. |
| F10 | Before storing and sending, replace the user's own address in the text with "[you]". Card numbers and IBANs are removed as today (`redactPaymentNumbers`). | A forward carries the user's address in its headers; it adds nothing to the extraction. |
| F11 | Never reply to inbound mail. Mail above Brevo's spam threshold, without a known token, or failing F4 is dropped silently. The daily cap (30 / 24 h) counts email captures too. | No mail loops, no backscatter, bounded cost. |
| F12 | The webhook always answers 200 once the payload is parsed (also for drops), and 401 for a wrong secret. A failure after the capture is saved becomes `extraction_error` with an empty proposal, as in Part B. | Brevo retries non-2xx; we never want duplicates. Idempotency: `captures.source_message_id` (unique per user) from the Brevo `MessageId`. |

## 3. Phases

### Phase 0: confirm and decide (owner, ~30 min)

Notes 2026-10-07 (F2 check from public docs): setup (2 MX records, one webhook API call) and payload fields (`From`, `To`, `Recipients`, `Subject`, `MessageId`, `RawTextBody`, `RawHtmlBody`, `SpamScore`, `Attachments[].DownloadToken`) match this plan. Not documented: which plans include inbound parsing, how long Brevo keeps inbound content and attachments (the events API defaults to the last 30 days), webhook signing. Open for the owner: check that the Inbound webhook type is selectable on the free plan; ask Brevo support about inbound content retention.

1. Owner answers F1–F4.
2. Confirm in the Brevo account: inbound parsing on the free plan, inbound retention and whether it can be shortened, and the exact payload field names (sender, recipients, subject, text and HTML bodies, attachments and how to download them). Record the answers here.
3. Update CLAUDE.md (move the line out of *Out of scope*, close the two open questions) and the brief's scope note.

### Phase 1: schema, address, settings
1. Migration `…_email_capture.sql`: `capture_input` + `email`; `captures.source_message_id text` with a unique index on `(user_id, source_message_id)`; `profiles.inbound_token text unique`, column not updatable by `authenticated` (column-level grant), set by `rotate_inbound_address()` (security definer, `search_path` empty, only for `auth.uid()`); backfill a token for existing profiles. An RLS read check stays as is.
2. Pure: `src/lib/extraction/inbound.ts`: `inboundAddress(token, domain)`, `parseInboundAddress(address)` → token or null, `isAllowedSender(from, accountEmail)` (case-insensitive, trimmed), `redactOwnAddress(text, email)`, `pickAttachments(list)` (types, size, at most 2).
3. Settings: a "Forward emails" section with the address, Copy, "New address" (confirm first: the old address stops working) and one line on what happens and that the email goes to Claude.
4. `check-rls`: A cannot read B's token, cannot set own token directly, can rotate own; anon cannot rotate.

### Phase 2: the Edge Function
1. `scripts/capture-bundle-entry.ts` + `pnpm bundle:capture` (same pattern as alerts; a Vitest test fails on a stale bundle).
2. `supabase/functions/receive-email/index.ts`: check the secret → for each item: spam score → recipient token → profile → sender check (F4) → idempotency → cap → download attachments from Brevo → store files → build content (text + attachments) → extraction (`claude-opus-5-5`, low effort, fallbacks, same schema) → `extractionToDraft` with the user's lookups and subscriptions → insert capture + proposal in one RPC or two inserts with cleanup. Logs carry counts and outcomes only, never content or addresses.
3. Extend `CaptureContent` / `extractionUserContent` with an `email` kind (text plus documents and images in one user turn).
4. Tests (Vitest, no network): the pure inbound helpers; the handler's decision function on recorded Brevo payloads (own forward with PDF, wrong sender, unknown token, duplicate MessageId, spam, over cap, oversized attachment, no body); `deno check` on the function.

### Phase 3: wire up and try it live
1. Owner: DNS MX records for `in.<domain>` (and the TXT record Brevo asks for); in Brevo, create the inbound webhook pointing at the function URL with the secret; set the function secrets (`INBOUND_SECRET`, `ANTHROPIC_API_KEY`, `INBOUND_DOMAIN`); `supabase functions deploy receive-email --use-api`.
2. Live checks with the guide-walk account (email changed to an inbox the owner controls, or a temporary test account): forward the fictional CodePilot receipt (expect: update with price change), a fictional PDF invoice as attachment (expect: name + amount, questions), a mail from a different sender (expect: nothing), the same mail twice (expect: one proposal).
3. Check Brevo's inbound log shows what we expect and nothing more is kept than Phase 0 found.

### Phase 4: docs
- `specs/logic-spec.md` §4: email as a fourth input; new edge cases (wrong sender, duplicate, forward header with own address, attachment plus body).
- `docs/tester-guide.md`: optional step "Write a made-up receipt email and forward it to the address in Settings". Testers still use made-up content only.
- Banner / privacy line: forwarded emails go through Brevo (EU) and are read once by Claude.

## 4. Risks

- **Real data from testers:** forwarding invites real receipts. The tester guide and the Settings text say made-up only; tester data is deleted after the round, as now.
- **Brevo free plan or retention does not fit:** the fallback is another EU inbound provider (to research then), or dropping the feature. Phase 0 decides before any build.
- **Forward formats:** Gmail, Apple Mail and Outlook quote forwards differently, and some send the original as an `.eml` attachment. First version: body text only plus pdf/image attachments; `.eml` attachments are listed in the notes as "not read".
- **Cost:** bounded by the shared daily cap; an email with two attachments costs more than a paste (estimate $0.05–0.15).

## 5. Done when

Forwarding the fictional CodePilot receipt from the account's own address to its Settings address creates "Update: CodePilot Pro · Price changed" in the review queue within about 30 seconds; a forward from another address creates nothing; the same mail twice creates one proposal; nobody can read or set another user's address; no email content appears in function logs.

Estimate: about 1–1.5 days after Phase 0.
