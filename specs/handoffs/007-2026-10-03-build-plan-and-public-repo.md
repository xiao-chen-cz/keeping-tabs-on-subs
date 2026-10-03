# Session Handoff - 2026-10-03

## Context
Wrote and reviewed the D9–15 build plan, finished Phase 0 (Supabase setup), then removed the owner's real data from the repo and moved the code to a new public GitHub repo with a fresh history. No app code beyond the D09 skeleton yet.

## Completed
- **Build plan:** `specs/todo/d09-15-core-list-and-preview.md`, 7 phases (0–6) for Oct 3–9. Key decisions: computed fields as pure TypeScript (no DB view), login before the list, email + password with accounts created by script (sign-ups off), hand-written SQL migrations pushed to the hosted project, pure `buildSeed(set, today)` so seed-data.md expectations become tests, `PlainDate` strings with day-number arithmetic, money in integer cents.
- **Cursor review, 2 rounds:** round 1 Yellow (6 findings, all applied), round 2 Green. Applied fixes: two-tier seed tests (exact snapshot at 2026-10-02, invariants at other dates); edits need only a name while creates need the full required set; `entry_source` starts as `manual`/`seed`; `alerts.ts` + E28–E33 moved to D21–23; Friday Oct 9 reserved for stabilisation; `check-rls` also tests ownership change.
- **Spec fixes:** `seed-data.md` full-set EUR totals corrected to 89.79 / 1,077.51 (the hand-written answer key had counted SafeHome 62.00 quarterly as 15.00/month). `logic-spec.md` §2.3: an empty or unknown cycle gets 7 days' notice.
- **Phase 0:** Supabase project `TabsOnSubs` (ref `fxjjtoletyemfnxbpehh`, eu-west-1 Ireland, Postgres 17) linked with the CLI; `supabase/config.toml` added; sign-ups and anonymous sign-ins verified off via `/auth/v1/settings`; `.env.local` created by the owner (URL, publishable key, secret key); packages `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `server-only`, dev `tsx`.
- **Real-data cleanup:** Sheet-era handoffs 001–004 moved to gitignored `/local-data/handoffs/`; logic-spec edge cases use the fictional seed names; Sheet ID, payment-method nicknames, owner email and business domain removed from tracked files; private details kept in `/local-data/private-notes.md`. `CLAUDE.md` has a new rule: tracked files never contain real data, the Sheet ID, or the owner's email/domain.
- **Public repo:** old repo renamed to `xiao-chen-cz/keeping-tabs-on-subs-private` (private; full old history pushed there, also local branch `private-history`). New public repo `https://github.com/xiao-chen-cz/keeping-tabs-on-subs` with one fresh commit `36bb610`. Remotes: `origin` = public, `private` = backup. Project git email set to the GitHub noreply address.
- **Tooling:** `cursor-grill-plan` / `cursor-grill-diff` re-enabled in `~/.claude/settings.json`; their `run-cursor.sh` now passes the bundle as an argument (cursor-agent ≥ 2026.10 ignores stdin) and uses `--trust` by default. `gpt-5.6-sol-high` stalled twice; `gpt-5.3-codex-high` works.

## In Progress
- **Vercel** is connected to the public repo (CLI confirmed: disconnected `-private`, connected `xiao-chen-cz/keeping-tabs-on-subs`). Not yet verified that a push to the public repo triggers a production deploy.

## Next Steps
1. Push a commit (e.g. this handoff) and check that production deploys from the public repo.
2. Read the D10 challenge card first and align the plan with it before building (we are ahead of the challenge: D09 only asked for a locally running skeleton).
3. Phase 1 of the plan: pure date logic test-first in `src/lib/dates/` and `src/lib/domain/` (E1–E27, E34–E37), domain tests in the Vitest node environment.
4. Phases 2–6 per the plan: schema + RLS + grants, auth + account scripts + seed, list, detail + add/edit, preview live; Friday Oct 9 stabilisation.
5. Before Phase 4 (list UI): decide look and feel (recommended Tailwind + shadcn/ui; owner said not to worry about design for now).
6. Before the tester round (Oct 18): install OrbStack so migrations are tried on a local Supabase stack first.

## Key Files
- `specs/todo/d09-15-core-list-and-preview.md` - the build plan (authoritative for D9–15 execution)
- `specs/logic-spec.md`, `specs/seed-data.md` - logic and seed answer key (updated this session)
- `CLAUDE.md` - project rules, incl. the new no-real-data-in-git rule
- `supabase/config.toml` - Supabase CLI config (project linked)
- `.env.local` - keys (gitignored; Claude cannot read `.env*` files by permission rule, scripts load it via `node --env-file`)
- `/local-data/private-notes.md`, `/local-data/handoffs/` - private, gitignored

## Blockers / Notes
- Never put the secret key in Vercel; it is for local scripts only.
- `git push` now goes to the public repo; double-check every commit and handoff for real data before pushing.
- Claude's auto mode blocks history rewrites; the owner ran the orphan-commit step manually.
- Supabase free tier pauses after 7 days without activity; check before Oct 18.
- Grill bundles and responses live in `/tmp` (`cursor-grill-plan-2026-10-03-round{1,2}.md`); not committed.
