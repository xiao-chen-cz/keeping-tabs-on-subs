-- Core schema: profiles, lookup tables, subscriptions. Rules: specs/logic-spec.md.
-- Computed fields (next renewal, cancel-by, ...) are never stored. Every table has RLS on user_id.
-- Auto-expose is off, so grants are explicit: authenticated only, nothing for anon.

create type public.subscription_status as enum ('confirmed', 'cancelled');
create type public.billing_cycle as enum ('monthly', 'quarterly', 'every_4_weeks', 'yearly');
create type public.currency as enum ('EUR', 'USD', 'GBP', 'CHF');
create type public.scope as enum ('business', 'personal', 'family');
create type public.confidence as enum ('high', 'medium', 'low');
create type public.entry_source as enum ('manual', 'seed');

-- updated_at trigger function. Empty search_path; nobody calls it directly.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  time_zone text not null default 'Europe/Berlin',
  reminder_offsets int[] not null default '{3,1,0}',
  display_name text
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  unique (user_id, name),
  unique (id, user_id)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  unique (user_id, name),
  unique (id, user_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  name text not null check (length(trim(name)) > 0),
  status public.subscription_status not null default 'confirmed',
  amount numeric(10, 2) check (amount >= 0),
  currency public.currency,
  billing_cycle public.billing_cycle,

  last_renewal_date date,
  trial_ends date,
  cancel_notice_days int check (cancel_notice_days between 0 and 365),

  regular_price numeric(10, 2) check (regular_price >= 0),
  promo_ends date,

  access_until date,
  category_id uuid,
  payment_method_id uuid,
  scope public.scope,
  confidence public.confidence,
  vendor text,
  plan text,
  cancel_url text,
  notes text,
  source public.entry_source not null default 'manual',
  kept_for_cancel_by date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscriptions_amount_needs_currency check (amount is null or currency is not null),
  constraint subscriptions_promo_both_or_neither check ((regular_price is null) = (promo_ends is null)),
  constraint subscriptions_access_until_cancelled check (access_until is null or status = 'cancelled'),
  -- Composite FKs: a row can never point at another user's lookup (MATCH SIMPLE: null category_id is allowed).
  constraint subscriptions_category_fk foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  constraint subscriptions_payment_method_fk foreign key (payment_method_id, user_id)
    references public.payment_methods (id, user_id) on delete set null (payment_method_id)
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index payment_methods_user_id_idx on public.payment_methods (user_id);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Row level security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.subscriptions enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy categories_select on public.categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy categories_insert on public.categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy categories_update on public.categories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_delete on public.categories for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy payment_methods_select on public.payment_methods for select to authenticated
  using ((select auth.uid()) = user_id);
create policy payment_methods_insert on public.payment_methods for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy payment_methods_update on public.payment_methods for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy payment_methods_delete on public.payment_methods for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy subscriptions_select on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy subscriptions_insert on public.subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy subscriptions_update on public.subscriptions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy subscriptions_delete on public.subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Grants: start from nothing (Supabase may add default privileges), then grant only what is used.
-- service_role (local scripts only, bypasses RLS) needs table privileges too.
revoke all on public.profiles, public.categories, public.payment_methods, public.subscriptions
  from anon, authenticated;
grant all on public.profiles, public.categories, public.payment_methods, public.subscriptions
  to service_role;
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.payment_methods, public.subscriptions to authenticated;
