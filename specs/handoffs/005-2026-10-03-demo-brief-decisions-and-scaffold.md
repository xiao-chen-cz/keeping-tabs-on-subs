# Session Handoff - 2026-10-03

## Context
Turned the Sheet-based project into a build plan for the Oct 24 demo ("Keeping Tabs on Subs", Next.js + Supabase). Settled all logic decisions D1–D11, wrote the brief, seed data and a one-page D08 deliverable, and scaffolded the app. Build starts now (milestone D9–15, Oct 3–9).

## Completed
- **Project docs:** `CLAUDE.md` (root, starts with `@AGENTS.md`), `Keeping Tabs on Subs — Demo Build Brief.md` (authoritative for scope/milestones), `Keeping Tabs on Subs — One-Page Brief (D08).md`, and the Google Doc version of the one-pager: https://docs.google.com/document/d/1L6GnMSRGjVAX8De4RpEVpdowHMzGl4FEr2QSLyntiWA/edit (kept in sync with the .md; page count not verified, may exceed one page).
- **Logic decisions, all in `specs/logic-spec.md`:** D2 (Needs update tag, sorted to the top of Upcoming), D3 (Trial dropped as a cycle, Trial tag, Quarterly added; allowed cycles Monthly / Quarterly / Every 4 weeks / Yearly), D4 (future Last renewal date is valid for a pending plan change; case E10/E10b), D6 (Status Confirmed/Cancelled plus nullable Access until, Ending group, cancelled rows have no renewals), D7 (totals per currency, no conversion), D8 (user's local date, default Europe/Berlin), D9 (price updated via review-queue receipt; "Price rises?" stays Yes until then), D10 (alerts at 3, 1, 0 days before cancel-by, once per renewal; Keep / Cancelled in one tap; price rise in the same alert), D11. Also: Upcoming tie-break (cancel-by, then next renewal, then name), required fields + missing-field questions (§4 rule 10), totals §3.3, edge cases E28–E37.
- **Sheet changes:** the trial row's cycle `Trial` → `Monthly`; H2 formula has a Quarterly branch; Notes written for the plan-change row; data validation on the cycle column done by the user.
- **Seed data:** `specs/seed-data.md`. Starter set for testers (#1 CodePilot Pro, #2 Notely Teams, #3 The Daily Ledger, #4 VoiceDraft Pro + proposal P1) and full set for the demo account/tests (12 subscriptions + P1–P3). Dates are offsets from the seeding day.
- **Scope decisions:** forward-to-address email capture dropped (out of scope); typed description added as a capture input; missing required fields get fixed questions from code (model only parses free-text answers); email alerts committed to D21–23 (replaces the optional digest); no second hosted instance, real data only as a local gitignored fixture; Hostinger self-hosting deferred.
- **Scaffold:** `git init -b main` at the project root; Next.js 16.3.8 / React 19 / TypeScript / Tailwind 4 / ESLint / App Router / `src/` / `@/*` alias; pnpm 12.8.1 installed globally via npm. `pnpm lint` and `pnpm build` pass. `.gitignore` extended with `/local-data/`, `/supabase/.temp/`, `.env*.local`. No commit made yet.
- **Supabase project `TabsOnSubs` setup (reviewed from a screenshot, not verified created):** advised region Frankfurt/EU (check in Project Settings; can't be changed later), Data API on, auto-expose new tables OFF, automatic RLS ON.

## In Progress
- Nothing mid-edit. Repo is initialised but uncommitted. The Supabase project may or may not be created yet.

## Next Steps
1. Make the first commit (user hasn't asked yet; confirm).
2. Read the Next.js docs in `node_modules/next/dist/docs/` (per `AGENTS.md`: this version has breaking changes) before writing app code.
3. Install Vitest, `@supabase/supabase-js` (+ `@supabase/ssr`) and the Supabase CLI; set up `.env.local` (never commit).
4. Write the pure date/flag logic from `specs/logic-spec.md` test-first (fixed injected "today", edge cases E1–E37, incl. alert offsets, totals, flags).
5. Write the Supabase schema migration: enums/check constraints, Category and Payment method lookup tables, computed fields as a view or functions, RLS policies on `user_id`, and explicit `grant` statements (auto-expose is off).
6. Seed script with `starter` and `full` sets from `specs/seed-data.md`; author the 4 sample captures under `seed/captures/` (`noteforge-billing.png`, `codepilot-receipt.txt`, `gymbox-invoice.pdf`, `readloop-trial-email.txt`), all fictional.
7. Renewals list ("Due soon" section at the top, Needs update / Trial / Ending tags, per-currency totals), detail view, add/edit form, then invite-only auth and the private preview (by Oct 9).
8. Later milestones: typed description + upload/paste capture + extraction + review queue + missing-field questions (Oct 10–14); due-soon section, email alerts (needs an outbound email provider, EU option, and a scheduler: Vercel Hobby cron is daily only, so check Supabase scheduler) (Oct 15–17); tester round (Oct 18–21); fix and record demo on sample data (Oct 22–24).

## Key Files
- `CLAUDE.md` - project guidance (rules, stack, scope, milestones); imports `AGENTS.md`
- `Keeping Tabs on Subs — Demo Build Brief.md` - full brief
- `Keeping Tabs on Subs — One-Page Brief (D08).md` - one-page deliverable (also in the Google Doc above)
- `specs/logic-spec.md` - business logic, edge cases, decisions D1–D11
- `specs/seed-data.md` - starter/full demo seed, review-queue proposals, expected totals/alerts
- `package.json`, `src/`, `next.config.ts` - scaffold
- The owner's Google Sheet (ID in `/local-data/private-notes.md`) - real data (private; never deployed)

## Blockers / Notes
- **Open small items:** rename "due-soon view" to a "Due soon" section at the top of the list in the brief/doc/CLAUDE.md (proposed, not yet confirmed); optional Sheet changes (Access until column W, empty H for Cancelled rows) pending the user's call; cut order currently says the question UI falls back to highlighted form fields, email alerts stay (my guess, user may change).
- The spec still has Sheet-vs-spec differences marked "Current in the Sheet" (e.g. no Needs update/Trial tags, cancelled rows still compute dates).
- Time-sensitive Sheet data: see `/local-data/private-notes.md`.
- Real data never enters the demo instance, git, recordings or the Google Doc; use `/local-data/` locally only.
- The Google Workspace MCP can't read files outside `/Users/xcz/.workspace-mcp/attachments`; pass content inline.
- The project folder path contains a space (`Subscription Manager`); scaffold was created in a subfolder and moved up to avoid an invalid package name.
