# Security checklist (D20)

Last run: 2026-10-03, against the hosted Supabase project and a local build. Rerun before every tester round and after every migration.

## Access boundaries

| Check | Result | How |
|---|---|---|
| One account cannot read another account's subscriptions, categories, payment methods or profile | Pass | `pnpm check-rls --accounts local-data/rls-accounts.json` (15 checks) |
| One account cannot insert rows for another, move its own row to another user, or point a row at another user's category | Pass | same |
| Logged-out (anon) requests get no rows from any table | Pass | same |
| No public sign-up | Pass (2026-10-03) | Supabase Auth settings: sign-ups and anonymous sign-ins off |
| Logged-out visitors only see `/login` | Pass locally | proxy redirect; every page and Server Action calls `requireUser()` |
| Server Actions re-check auth, never trust `user_id` or `source` from the form | Pass | `subscriptions/actions.ts`, zod strips unknown keys |

## Secrets

| Check | Result | How |
|---|---|---|
| No credentials in the repository | Pass | `git grep` for key prefixes and JWTs: 0 hits; `.env*` and `/local-data/` are gitignored |
| Secret (service role) key not in browser code | Pass | 0 hits in `.next/static`; the admin client is imported only by `scripts/` and throws inside the Next runtime |
| Secret key not on Vercel | Pass by rule | only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key go to Vercel (Phase 6) |
| Throwaway test-account passwords | Local only | `local-data/test-accounts.jsonl`, `rls-accounts.json` (mode 600, gitignored) |

## Data

| Check | Result | How |
|---|---|---|
| Demo data is fictional | Pass | seed comes only from `specs/seed-data.md` |
| No owner email, business domain or Sheet ID in tracked files | Pass | `git grep`: 0 hits |
| EU only | Pass | Supabase eu-west-1, Vercel functions fra1 |

## Not verified yet (demo limitations)

- `check-rls` has not yet run against **production** (Phase 6, after the env vars are set).
- `.env.example` was written by a subagent and is not committed: Claude may not read `.env*` files, so the owner must check that it holds variable names only before committing it.
- Captures and file storage (D16–20) do not exist yet; storage bucket policies need their own checks.
- Rate limiting on login is Supabase's default only.
