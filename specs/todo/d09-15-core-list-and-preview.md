# Plan: D9–15 core (logic, schema, auth, list, detail, add/edit, private preview)

Created 2026-10-03 · Milestone D9–15 (Oct 3–9) · Source of truth: `specs/logic-spec.md`, `specs/seed-data.md`, Demo Build Brief

## 1. Problem and objectives

The skeleton is deployed (public placeholder at https://keeping-tabs-on-subs.vercel.app). By **Fri 2026-10-09** the same URL must be a private preview:

- Only invited accounts can log in, and each sees only its own data (RLS on `user_id`).
- After login, each account sees its seeded fictional data (`starter` or `full`) in a renewals list: Needs update rows on top, Trial tags, an Ending group, per-currency monthly and yearly totals.
- The user can tap an entry for detail, add a subscription manually and edit one.
- Every computed value (next renewal, days until renewal, cancel-by, days until cancel-by, renewal amount, price rises, flags, totals, sort order) comes from pure TypeScript functions. Vitest covers logic-spec §5 cases E1–E27 and E34–E37 with an injected "today".

**Out of this plan** (separate plans later): captures, extraction, review queue, missing-field questions and the sample capture files (D16–20); the "Due soon" section, the pure alert logic and its tests (E28–E33), alert sending and Keep/Cancelled actions (D21–23); importing real data into a local DB (needs Docker, see §9).

## 2. Decisions taken in this plan

Each decision is open to challenge in `/codex-grill-plan`.

| # | Question (from handoff 006) | Decision | Why |
|---|---|---|---|
| P1 | Computed fields: DB view or TypeScript? | **Pure TypeScript functions** in `src/lib/domain/`. The DB stores inputs only, with no view. | "Today" must be injected and tested (D8). A SQL view would need its own "today" and time-zone handling, and the reminder job (D21–23, Node) would duplicate the logic. Per-user row counts are small (<100), so sorting and filtering in TS is fine. One implementation, one test suite. |
| P2 | Auth before or after the list? | **Auth before the list** (Phase 3, before any data screen). | RLS needs `auth.uid()` to return any rows, so the list cannot read real tables without a session. The production URL is public. Building the list on a logged-in user avoids a later retrofit. |
| P3 | Auth method | **Email + password**, accounts created by the owner with a script. Supabase "Allow new users to sign up" is **off**. No password reset or change in-app (the owner resets via the dashboard). | Magic links depend on Supabase's built-in SMTP (a few emails per hour, unreliable for testers). Passwords need no email provider before D21. |
| P4 | Migration workflow | Hand-written SQL in `supabase/migrations/`, applied with `supabase link` + `supabase db push` to the hosted project. Types via `supabase gen types typescript --linked`. **Before the tester round (Oct 18):** install OrbStack (Docker) so later migrations are tried on a local Supabase stack (`supabase start`) before they reach the hosted project. | Docker is not installed, so there is no local Supabase stack and no `db diff`, and the hosted project is the only database. Until Oct 18 it holds only seeded fictional data, so pushing directly is acceptable. From the tester round on, testers may add their own data (deleted after the round), so a broken migration would hit real rows; hence the local stack first. |
| P5 | Per-account seeding | A pure `buildSeed(set, today)` returns rows. `scripts/create-account.ts` (local only, secret key) creates the auth user, profile, lookups and seed rows. Reset = delete the user's rows + rerun. | A pure builder means the seed-data expectations (totals, order, alerts) become Vitest tests. The secret key never leaves the owner's machine. |
| P6 | Date representation | `PlainDate` = ISO string `YYYY-MM-DD`, with arithmetic on integer day numbers (UTC epoch days). No JS `Date` in domain logic, no date library. | Avoids DST and time-zone bugs. Postgres `date` columns already arrive as `YYYY-MM-DD` strings. |
| P7 | "Today" | `todayIn(timeZone, now: Date): PlainDate` via `Intl.DateTimeFormat`. Each request computes it from `profiles.time_zone` (default `Europe/Berlin`). | D8. One function, also usable by the D21 cron job. |
| P8 | Money | DB `numeric(10,2)`. TS works in integer cents for comparisons and sums. The monthly total is kept unrounded, and yearly = unrounded monthly × 12, rounded only for display. | E36: 22.17 monthly and 266.00 yearly. Rounding monthly first would give 266.04. |
| P9 | Rendering and caching | `cacheComponents` stays **off**. All app pages are dynamic per user. Mutations are Server Actions followed by `redirect()` (or `refresh()` from `next/cache`). | Per-user data with nothing worth caching. Keeps Next 16 surprises small. |
| P10 | Currency | Postgres enum `currency`: `EUR`, `USD`, `GBP`, `CHF`. More values can be added with `alter type ... add value`. | CLAUDE.md asks for an enum. Testers may have GBP/CHF; totals are per currency anyway (D7). |

## 3. Pre-build fixes (Phase 0, ~30 min)

1. **Seed-data inconsistency: FIXED 2026-10-03.** The hand-written expected totals counted SafeHome Insurance (62.00 EUR Quarterly) as 15.00 a month instead of 20.67. `seed-data.md` now expects EUR monthly 89.79 and yearly 1,077.51 (SafeHome stays at 62.00). The app always computes totals; these numbers are only the test's answer key.
2. **Verify the Supabase project** `TabsOnSubs`: region is EU (owner reports Ireland `eu-west-1`, created 2026-10-02; EU is the requirement, the extra hop from Vercel `fra1` is ~20–30 ms and acceptable), Data API on, auto-expose new tables off, sign-ups disabled (Auth → Providers → Email: "Allow new users to sign up" off), Site URL = production URL. If the region is not EU, delete it and recreate it now, while it is empty.
3. Note the free-tier pause: Supabase pauses projects after 7 days without activity. Not a risk during active build, but check before the tester round (Oct 18).

## 4. Target structure

```
supabase/
  config.toml                      # from `supabase init`
  migrations/20261005090000_core_schema.sql
scripts/
  create-account.ts                # create auth user + profile + lookups + seed set
  reset-account.ts                 # delete user's rows, reseed
  check-rls.ts                     # isolation check against the hosted project
src/
  proxy.ts                         # session refresh + optimistic redirect to /login
  lib/
    dates/plain-date.ts            # PlainDate, toDayNumber, addDays, addMonthsClamped, diffDays, todayIn
    domain/
      types.ts                     # SubscriptionInput, BillingCycle, Status, Currency, ComputedSubscription
      schedule.ts                  # nextRenewal (§2.1), daysUntil
      notice.ts                    # defaultNotice, effectiveNotice (§2.3), cancelBy (§2.4)
      pricing.ts                   # renewalAmount (§2.6), priceRises (§2.7)
      flags.ts                     # isTrial, needsUpdate, isEnding, isArchived (§2.8)
      compute.ts                   # computeSubscription(input, today) -> all computed fields + tags
      upcoming.ts                  # groupAndSort(rows, today) -> { upcoming, ending, archived } (§3.1)
      totals.ts                    # totalsByCurrency(rows, today) (§3.3)
      *.test.ts                    # colocated; edge-cases.test.ts holds the E-case table
                                   # (alerts.ts + E28–E33 come with the D21–23 plan)
    seed/
      sets.ts                      # the 12 rows as offset specs, starter/full membership
      build-seed.ts                # buildSeed(set, today) -> rows with real dates
      build-seed.test.ts           # asserts seed-data.md expectations
    supabase/
      server.ts                    # createServerClient (@supabase/ssr) with cookies()
      admin.ts                     # secret-key client, imported by scripts only
      database.types.ts            # generated
    dal/                           # `import 'server-only'`
      auth.ts                      # getUser() (React cache), requireUser()
      subscriptions.ts             # list, get, create, update (RLS client), map row -> SubscriptionInput
      lookups.ts                   # categories, payment methods
    validation/subscription-form.ts  # zod schema shared by add/edit
  app/
    layout.tsx                     # metadata robots noindex
    login/page.tsx, login/actions.ts
    (app)/layout.tsx               # header with sign-out (fetches user; auth check stays in DAL)
    (app)/page.tsx                 # renewals list
    (app)/subscriptions/new/page.tsx
    (app)/subscriptions/[id]/page.tsx
    (app)/subscriptions/[id]/edit/page.tsx
    (app)/subscriptions/actions.ts # create/update server actions
  components/
    renewal-row.tsx, tag.tsx, totals-card.tsx, subscription-form.tsx, ...
```

Domain and seed tests run with `// @vitest-environment node` (or a Vitest `projects` split: `node` for `src/lib/**`, `jsdom` for components).

## 5. Phases

### Phase 0: Setup (Sat Oct 3)
- [ ] Pre-build fixes from §3.
- [ ] Install: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `server-only`; dev: `tsx`.
- [ ] `supabase init`, `supabase login`, `supabase link --project-ref <ref>`.
- [ ] `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (scripts only). Add `.env.example` with names only (the current `.gitignore` has `.env*`, so add `!.env.example`).
- [ ] Read before coding: Next docs `02-guides/authentication.md` (DAL, Proxy), `02-guides/forms.md`, `02-guides/data-security.md`, `03-file-conventions/proxy.md`. Also read the current `@supabase/ssr` Next.js guide for the proxy/`updateSession` pattern and `getClaims()` vs `getUser()`.

**Done when:** `supabase projects list` shows the linked project in an EU region; `pnpm build` still passes.

### Phase 1: Pure logic, test-first (Sat Oct 3 – Sun Oct 4)
Write tests first, from logic-spec §5, as one table-driven file (`edge-cases.test.ts`) keyed by case ID, plus focused unit tests per module.

1. `plain-date.ts`: `addMonthsClamped(anchor, n)` always from the original anchor (31 Jan +1 → 28 Feb, +2 → 31 Mar); leap years; `diffDays`; `todayIn('Europe/Berlin', 2026-10-01T22:30Z) = 2026-10-02` and `todayIn` at a DST switch.
2. `schedule.ts` `nextRenewal(input, today)` following §2.1 in order, with the Cancelled check first (E26):
   0. Status Cancelled → null.
   1. Trial ends ≥ today → Trial ends.
   2. Missing anchor or cycle (or unknown cycle) → null.
   3. Last renewal ≥ today → Last renewal (D4).
   4. Every 4 weeks: smallest n ≥ 1 with anchor + 28n ≥ today. Compute it directly (ceil), not in a loop.
   5. Months (k = 1/3/12): smallest n ≥ 1 with `addMonthsClamped(anchor, n·k) ≥ today`. Estimate n from the month difference, then check n−1, n, n+1 (clamping can put the result on either side).
3. `notice.ts`: default 3 for Monthly / Every 4 weeks, 7 otherwise, **including an empty or unknown cycle** (logic-spec §2.3, added 2026-10-03; E12). The override `cancel_notice_days` wins when not null.
4. `pricing.ts`: E18–E24. Regular price applies only when both Regular price and Promo ends are set and Promo ends ≤ next renewal. Compare in cents.
5. `flags.ts`: Trial (E11, E12), Needs update (E13, E15, E16), Ending (E34), archived (E35).
6. `upcoming.ts`: filter Status ≠ Cancelled; sort Needs update first, then cancel-by asc, next renewal asc, name (locale-aware, case-insensitive). Ending group = Cancelled with access_until ≥ today, sorted by access_until. Archived = the other Cancelled rows.
7. `totals.ts`: §3.3 and E36/E37. Include only Confirmed, not an active trial, cycle set, amount set. The result is a map of currency to `{ monthly, yearly }` (unrounded) plus a display formatter.

The pure alert logic (`alerts.ts`, E28–E33) is **not** in this milestone. It moves to the D21–23 plan, where the Due soon section and the alert job use it.

**Done when:** E1–E27 and E34–E37 each have a named test (`E1`, `E2b`, …) and pass; `pnpm test` and `pnpm lint` are green. If a test shows the spec is ambiguous, stop and update `logic-spec.md` (and note it in the handoff); do not quietly pick an answer.

### Phase 2: Schema, RLS, grants (Mon Oct 5)
One migration, `core_schema.sql`:

- **Enums:** `subscription_status` (`confirmed`, `cancelled`), `billing_cycle` (`monthly`, `quarterly`, `every_4_weeks`, `yearly`), `currency` (P10), `scope` (`business`, `personal`, `family`), `confidence` (`high`, `medium`, `low`), `entry_source` (`manual`, `seed` only; the capture values are added by the D16–20 migration). TS keeps a label map for display ("Every 4 weeks").
- **`profiles`:** `user_id uuid pk references auth.users on delete cascade`, `time_zone text not null default 'Europe/Berlin'`, `reminder_offsets int[] not null default '{3,1,0}'`, `display_name text`.
- **`categories`** and **`payment_methods`:** `id uuid pk`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `name text not null`, `unique (user_id, name)`, `unique (id, user_id)` (target for composite FKs). Per-user lists (logic-spec says "user-managed"), seeded per account.
- **`subscriptions`:**
  - Identity: `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid()`.
  - Main fields: `name text not null check (length(trim(name)) > 0)`, `status subscription_status not null default 'confirmed'`, `amount numeric(10,2) check (amount >= 0)`, `currency currency`, `billing_cycle billing_cycle`.
  - Dates: `last_renewal_date date`, `trial_ends date`, `cancel_notice_days int check (between 0 and 365)`.
  - Promo: `regular_price numeric(10,2) check (>= 0)`, `promo_ends date`.
  - Other fields: `access_until date`, `category_id uuid`, `payment_method_id uuid`, `scope scope`, `confidence confidence`, `vendor text`, `plan text`, `cancel_url text`, `notes text`, `source entry_source not null default 'manual'`, `kept_for_cancel_by date` (D10, unused until D21).
  - Timestamps: `created_at`, `updated_at` (trigger).
  - Checks: `(amount is null) or (currency is not null)`; `(regular_price is null) = (promo_ends is null)` (both or neither, §4 rule 9); `access_until is null or status = 'cancelled'`.
  - Composite FKs `(category_id, user_id) → categories (id, user_id)` and the same for payment methods, so a row can never point at another user's lookup.
  - Index `(user_id)`.
- **RLS:** enable on all four tables. For each table, policies for `select`, `insert`, `update`, `delete` `to authenticated` with `using/with check ((select auth.uid()) = user_id)`. `profiles` gets select/update only (rows are created by the script).
- **Grants** (auto-expose is off): `grant usage on schema public to authenticated`; `grant select, insert, update, delete` on the three data tables and `select, update` on profiles `to authenticated`. Nothing to `anon`; add an explicit `revoke all ... from anon` for clarity.
- Push with `supabase db push`, then `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.
- `scripts/check-rls.ts`: with two test accounts (from Phase 3), sign in as A and assert that A sees only A's rows, cannot read B's row by id, cannot insert with `user_id = B`, cannot update A's own row to `user_id = B` (the `with check` must block the ownership change), and cannot point `category_id` at B's category. An anon client sees zero rows and gets a permission error. Run after every migration.

**Done when:** migration applied; types generated; `check-rls` passes (it can run at the end of Phase 3 once accounts exist).

### Phase 3: Auth, accounts, seed (Mon Oct 5 – Tue Oct 6)
1. `lib/supabase/server.ts` per the `@supabase/ssr` guide (await `cookies()`, which is async in Next 16).
2. `src/proxy.ts`: refresh the session cookie and redirect unauthenticated requests to `/login` (optimistic check only). The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `/login` (and `/demo` if Phase 7 is built).
3. `dal/auth.ts`: `getUser = cache(async () => ...)` using a verified check (`auth.getUser()` or `getClaims()` per the current Supabase docs, never an unverified `getSession()`); `requireUser()` redirects to `/login`. **Every page and every Server Action calls the DAL**; layouts do not do auth checks (Next docs: layouts don't re-render on navigation).
4. `/login`: email + password form with `useActionState`, a generic error message ("Email or password is wrong"), and a redirect to `/` on success. A sign-out button in the `(app)` header calls a server action.
5. `lib/seed/sets.ts` + `build-seed.ts`: the 12 rows from seed-data.md as offset specs.
   - **Anchor derivation gotcha.** "Last renewal = Next minus one cycle" breaks for month cycles when Next is on the 29th–31st and the earlier month is shorter. Example: Next 31 Oct → anchor 30 Sep → recomputed Next 30 Oct.
   - Rule: anchor = Next − n·k months for the smallest n ≥ 1 where `nextRenewal(anchor, today) === Next`, and the builder throws if none is found within 12 tries. Every 4 weeks: Next − 28. Rows with explicit anchors (#6 future, #9 the latest 31st ≤ T) are set as written.
6. `build-seed.test.ts`, in two tiers. #9 Cloudly ("latest 31st on or before T") is calendar-dependent on purpose (it demonstrates month-end clamping), so exact snapshots only hold at a fixed date.
   - **Tier 1, snapshot at fixed today 2026-10-02**, matching seed-data.md verbatim:
     - Starter: upcoming order Daily Ledger, VoiceDraft, CodePilot, Notely; EUR 22.17 / 266.00; USD 30.00 / 360.00; Daily Ledger and VoiceDraft at days-until-cancel-by 3 (VoiceDraft with price rise 120 → 200).
     - Full: PixelStock first (Needs update), then ChatPal (−2), BudgetBuddy (+2), Daily Ledger (+3), VoiceDraft (+3); tags Trial (StreamBox), Ending (FitClub); EUR 89.79 / 1,077.51 and USD 30.00 / 360.00.
   - **Tier 2, invariants at several other todays** (a 31st, 28 Feb, 29 Feb of a leap year, 1 Jan):
     - Every offset row lands on its documented offset (anchor round-trip, step 5).
     - Needs update rows come first, and Ending and archived rows are excluded from Upcoming.
     - The 11 rows other than Cloudly keep their documented relative order.
     - Totals are unchanged (no row's amount or inclusion depends on the date).
     - Cloudly's next renewal is the last day of its month whenever that month has fewer than 31 days.
7. `scripts/create-account.ts --email x --set starter|full [--today YYYY-MM-DD]`:
   - Uses the admin client to create the user (`email_confirm: true`) and generates a random password, printed once.
   - Inserts the profile, categories (the 9 from logic-spec) and payment methods (`Private account`, `Business account`), then the seed rows (`source = 'seed'`).
   - Idempotent per email: if the user exists, refuse and point to `reset-account`.
   - `scripts/reset-account.ts --email x --set ...` deletes the subscriptions and lookups for that user and reseeds them.
8. Create accounts: the owner's demo account (`full`) and two throwaway test accounts (`starter`) for `check-rls`. Delete the throwaway accounts after the check, or keep them for later RLS reruns (owner's call).

**Done when:**
- Logged out, `/` redirects to `/login`.
- Logging in as the demo account lands on `/` (placeholder content is fine).
- `check-rls` passes.
- Seed tests are green.

### Phase 4: Renewals list (Tue Oct 6 – Wed Oct 7)
- `(app)/page.tsx` (Server Component):
  1. `requireUser()`, then the profile's time zone and `today = todayIn(tz, new Date())`.
  2. `listSubscriptions()` with category and payment-method names joined.
  3. Map to `SubscriptionInput`, then `computeSubscription` and `groupAndSort`, then render.
- Layout, mobile first, single column, max width ~28rem:
  1. **Totals card** at the top: one line per currency, "€84.13 / month · €1,009.51 / year". Format with `Intl.NumberFormat('de-DE' or en-GB)`; pick one locale and use it everywhere (default **en-GB with currency symbol**).
  2. **Upcoming** list. Each row shows:
     - name with tags (Needs update, Trial)
     - renewal amount + currency, with the price rise shown as "120 → 200 USD" when Price rises = Yes
     - next renewal date and "in N days" ("today" for 0)
     - cancel-by, shown as "cancel by 5 Oct (in 3 days)" or "deadline passed" when L < 0
     - for a D4 future anchor, "plan starts on <date>" (optional hint)
  3. **Ending** group: name, "access until <date>", Ending tag.
  4. Link "Show cancelled" → `?show=cancelled` lists the archived rows (cut first if behind).
  5. Floating or bottom "Add subscription" button → `/subscriptions/new`.
- Empty state: "No subscriptions yet" + add button.
- Presentational components take computed view-models (no data fetching), so RTL tests can render them with fixtures: tags appear, Needs update renders first, the Ending group renders, the price-rise arrow shows.

**Done when:** the demo account shows the full set exactly as seed-data.md "What the full set shows" describes, at 375px width, in light and dark mode.

### Phase 5: Detail and add/edit (Wed Oct 7 – Thu Oct 8)
- **Detail** `/subscriptions/[id]` (`params` is a Promise in Next 16: `const { id } = await props.params`).
  - Shows every list field plus: vendor, plan, renewal amount if different, notice days with "(default)" or "(custom)", access until (cancelled only), cancel URL as an external link, payment method, category, scope, confidence, source, notes.
  - "Link to original capture" waits until D16.
  - `notFound()` when RLS returns no row; this also covers another user's id.
  - An "Edit" button.
- **Form** (`subscription-form.tsx`, client component with `useActionState`), shared by new and edit:
  - Fields: name\*, status, amount + currency, billing cycle (select of 4), last renewal date, trial ends, cancel notice days (placeholder shows the computed default, empty = default), regular price + promo ends, access until (only shown when status = Cancelled), category, payment method, scope, confidence, vendor, plan, cancel URL, notes.
  - Native `<input type="date">` and `inputMode="decimal"` for amounts (comma or dot accepted).
- **Validation** (`validation/subscription-form.ts`, zod, run on the server in the action and reused on the client for hints). Rules depend on the operation:
  - **Create (Confirmed):** the full required set from logic-spec §4 rule 10: name, amount, currency, cycle, and one date (last renewal or trial ends). A new Cancelled row needs only a name.
  - **Edit an existing row:** only the name is required, so harmless edits (notes, category, payment method) work on incomplete rows. A row that is still incomplete keeps its Needs update tag. The form shows a hint listing the missing fields, but saving is not blocked.
  - **Always, on both:** amount needs a currency; regular price and promo ends both or neither; access until only when Cancelled (cleared when the status changes back); notice days 0–365; cancel URL must be `https:`.
  - Field errors are returned to the form, and entered values are preserved.
- **Actions** (`subscriptions/actions.ts`):
  - Each calls `requireUser()` first, then parses with zod and inserts or updates through the RLS client.
  - Never accept `user_id`, `source` or computed values from the form. New rows get `source = 'manual'`.
  - Then `redirect` to the detail page.
  - Update uses `.eq('id', id)` and treats 0 affected rows as not found.
- No delete in this milestone (cancelled + archive covers it). Add it later if testers ask.
- Tests: zod schema unit tests (create requires the full set, edit requires only the name, both-or-neither, cancelled minimal, decimal comma); one RTL test that the form shows server field errors.

**Done when:** on a phone-sized viewport the user can add a monthly subscription, see it in the right place in the list, edit its notice days and watch cancel-by move, and set it Cancelled with access until and see it move to Ending.

### Phase 6: Private preview live (Thu Oct 8 – Fri Oct 9)
- Vercel env vars (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **Never** `SUPABASE_SECRET_KEY`.
- Supabase Auth URL config: Site URL = production URL. Add the preview URL pattern only if preview deployments are used.
- `robots: { index: false, follow: false }` in root metadata, plus `public/robots.txt` disallowing all.
- Push to `main` → auto-deploy, then a smoke test on a real phone:
  - The login page loads.
  - The demo account sees the full set.
  - Add, edit and cancel work.
  - Logged-out access to `/subscriptions/<id>` redirects to login.
- Run `check-rls` against production once more.
- README: account scripts, env vars, migration commands. Update `CLAUDE.md` only if a rule changed.
- `/EA-handoff`.

**Done when:** a second phone, logged in with a starter account, sees only the 4 starter rows; the logged-out URL shows only the login page.

### Phase 7 (optional): Public read-only demo at `/demo`
Decided 2026-10-03. A public page anyone can open without a login, showing the full fictional set. **First to cut**: do it only if Phase 6 is done early, otherwise after Oct 9.

- **No database, no login.** `/demo` builds its rows in memory with `buildSeed('full', today)` and the domain functions, so nothing can be changed and nothing is shared. Rejected alternative: a shared read-only account with a public password. Anyone logged in can change that account's password through the Supabase Auth API, and read-only would have to be enforced in RLS too.
- **Today:** `todayIn('Europe/Berlin', new Date())`, so the demo is always current (something is always due in 3 days).
- **Routes:**
  - `/demo` reuses the list components with the in-memory view-models.
  - `/demo/[n]` reuses the detail component. The id is the seed row's stable key, not a UUID.
  - There are no edit, add or cancel controls.
  - A banner reads "Demo with sample data. Sign in for your own."
- **Proxy:** add `/demo` to the matcher exclusions next to `/login`.
- **Data:** the presentational components already take computed view-models (Phase 4), so the demo needs no data-layer changes. Keep the components free of Supabase types so both sources fit.
- **Later (D16+):** show the seeded proposals P1–P3 read-only. Live capture stays login-only because of AI cost and abuse.
- **Tests:** one RTL test that `/demo` renders the full set's order and tags, and one that no edit links are present.

**Done when:** logged out, `/demo` on a phone shows the 12 fictional subscriptions with correct tags and totals, and there is no way to change anything.

## 6. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Dates and domain | Vitest (node env) | E1–E27 and E34–E37 as named table cases, plus unit tests for month clamping, `todayIn`, sorting ties, totals rounding |
| Seed | Vitest | seed-data.md snapshot at a fixed today, plus invariants at several other "todays" |
| Validation | Vitest | zod schema rules |
| Components | Vitest + RTL (jsdom) | list rows/tags/groups, totals card, form error rendering, all with fixtures |
| RLS / grants | `scripts/check-rls.ts` against hosted Supabase | isolation, anon denied, cross-user FK blocked |
| End to end | Manual checklist on a phone (Phase 6) | Playwright deferred to the tester-round prep, if at all |

Async Server Components are not unit-tested (Vitest does not support them, per the Next testing docs); keep logic out of them so that does not matter.

## 7. Schedule and cut order

| Day | Date | Phase |
|---|---|---|
| Sat | Oct 3 | 0, start 1 |
| Sun | Oct 4 | 1 |
| Mon | Oct 5 | 2, start 3 |
| Tue | Oct 6 | 3, start 4 |
| Wed | Oct 7 | 4, start 5 |
| Thu | Oct 8 | 5, 6 (deploy) |
| Fri | Oct 9 | **Stabilisation:** production checks on a phone, `check-rls` against production, regression fixes, handoff. No new features. |

Already cut at plan start: `alerts.ts` + E28–E33 (moved to D21–23).

If behind, cut in this order (first cut first):
0. Phase 7, the public `/demo` page (optional from the start).
1. "Show cancelled" archive view.
2. Component (RTL) tests beyond list ordering and tags.
3. Less important form fields: vendor, plan, scope, confidence (keep them in the schema and fill them from the seed).
4. Dark-mode polish.

Never cut: domain tests for E1–E27 and E34–E37, RLS + grants + `check-rls`, invite-only auth, the secret key staying off Vercel, the Friday stabilisation day.

## 8. Risks

- **Next 16 + `@supabase/ssr` drift.** Proxy replaced middleware, and request APIs are async. Read both docs first and follow the Supabase guide's current `proxy.ts` example, not memory.
- **Month-clamp seeds.** Mitigated by the round-trip rule and the tier-2 seed invariants (Phase 3, steps 5–6).
- **Spec gaps found by tests** (like the notice default for an empty cycle, now in logic-spec §2.3). Update `logic-spec.md` in the same commit, never only the code.
- **Hosted-only DB.** A bad migration hits the only instance. Until Oct 18 it holds only fictional seed data, so the recovery is to fix the migration, reset the schema and reseed the accounts. Write migrations as additive files and never edit an applied one. Install OrbStack and use a local Supabase stack before testers arrive (P4), because tester-entered data can't be reseeded.
- **Time zone at the day boundary.** `todayIn` is tested at 22:30Z and 23:30Z around Berlin midnight.

## 9. Not in this plan (recorded so it isn't lost)

- Captures, proposals and storage tables, the 4 sample captures, extraction, review queue, questions: D16–20 plan. Seed proposals P1–P3 are added to `buildSeed` then.
- Due-soon section, pure alert logic (`alerts.ts`, E28–E33), the daily alert job, email provider (EU), Keep/Cancelled links: D21–23 plan. `kept_for_cancel_by` and `reminder_offsets` already exist in the schema.
- Local real-data fixture: needs Docker + `supabase start`. Not needed until the owner wants to dogfood with real data; keep it out of the D9–15 path.
- Lookup list management (add/rename categories and payment methods), password change, account deletion.
- Small items from handoff 005: rename "due-soon view" → "Due soon" section in brief/CLAUDE.md, optional Sheet changes (Access until column, empty H for Cancelled), cut-order wording.

## 10. Success criteria

- [ ] `pnpm test`, `pnpm lint`, `pnpm build` green; E1–E27 and E34–E37 each have a named passing test (E28–E33 belong to D21–23).
- [ ] Seed tests match seed-data.md exactly at 2026-10-02 and hold their invariants at several other "todays".
- [ ] Production URL shows only a login page when logged out; there is no sign-up path, in the UI or via Supabase Auth.
- [ ] `check-rls` passes against production: no cross-user reads or writes, anon denied.
- [ ] Demo account (full set) and one starter account work on a phone: list, detail, add, edit, cancel → Ending.
- [ ] No computed field is stored or typed; the secret key exists only in `.env.local`; none of the owner's real data anywhere in the repo or the hosted project.
