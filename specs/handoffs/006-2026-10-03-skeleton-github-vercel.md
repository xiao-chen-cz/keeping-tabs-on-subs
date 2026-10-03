# Session Handoff - 2026-10-03

## Context
Did challenge D09 (smallest runnable app skeleton), then put the repo on GitHub and connected Vercel so the skeleton is deployed. Ended by deciding to write a proper build plan in a fresh session before more app code.

## Completed
- **D09 skeleton:** Vitest 5 + React Testing Library + jsdom installed per the Next.js docs (`vitest.config.mts`, uses native `resolve.tsconfigPaths`, no `vite-tsconfig-paths`). Home page `src/app/page.tsx` shows "Keeping Tabs on Subs" and a tagline; metadata updated in `src/app/layout.tsx`; smoke test `__tests__/page.test.tsx`. Scripts: `pnpm dev | test | test:watch | lint | build`, documented in `README.md`. Unused starter SVGs removed from `public/`. Lint, test and build pass; dev server serves the heading.
- **GitHub:** private repo https://github.com/xiao-chen-cz/keeping-tabs-on-subs, `main` pushed and tracking `origin/main`. Commits: scaffold + Vitest + home page, docs/specs/handoffs, `vercel.json`. Commits carry the Co-Authored-By trailer.
- **Vercel:** project `keeping-tabs-on-subs` (team `xiao-chen-czs-projects`) linked via CLI and connected to the GitHub repo; pushes to `main` auto-deploy to production. `vercel.json` pins `regions: ["fra1"]` (no functions exist yet). Live at https://keeping-tabs-on-subs.vercel.app (HTTP 200). `.vercel/` is gitignored.

## In Progress
- Nothing mid-edit. Working tree clean after the `vercel.json` push (this handoff file is the only new file).
- Supabase project `TabsOnSubs` still unverified (see handoff 005): confirm it exists and is in an EU region.

## Next Steps
1. Fresh session (user plans to use Opus): run `/EA-plan` to write a build plan into `specs/todo/`, then `/codex-grill-plan` to have Codex critique it before any app code.
2. Scope the plan to D9–15 (schema, pure date/flag logic, list, detail, add/edit, invite-only auth, private preview by Oct 9). Plan capture/extraction/review queue separately afterwards.
3. The plan should decide: computed fields as DB view vs TypeScript functions; auth before or after the list (production URL is currently public); migration workflow (Supabase CLI against the hosted project) and per-account seeding; how Vitest covers E1–E37 with injected "today" and Europe/Berlin; what to cut if behind.
4. Then execute: first the pure logic test-first, Supabase schema/RLS/grants, seed script and sample captures, list/detail/add-edit, auth.
5. Still-open small items from handoff 005: rename "due-soon view" to a "Due soon" section; optional Sheet changes (Access until column, empty H for Cancelled rows); cut-order wording in the brief.

## Key Files
- `vercel.json` - Frankfurt function region
- `vitest.config.mts`, `__tests__/page.test.tsx` - test setup and smoke test
- `src/app/page.tsx`, `src/app/layout.tsx` - home page and metadata
- `README.md` - run/test/lint/build commands
- `CLAUDE.md`, `AGENTS.md` - project rules (AGENTS.md: read `node_modules/next/dist/docs/` before writing Next code)
- `specs/logic-spec.md`, `specs/seed-data.md`, `Keeping Tabs on Subs — Demo Build Brief.md` - scope and logic sources of truth

## Blockers / Notes
- Production URL is public with a placeholder page; invite-only auth must exist before test users get anything real.
- Time-sensitive Sheet data: see `/local-data/private-notes.md`.
- Real data stays out of git, the demo instance and recordings (`/local-data/` only).
- `vercel link` / `vercel git connect` can take over 2 minutes in the CLI; run in background.
