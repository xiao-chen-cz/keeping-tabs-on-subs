-- Review queue (D16-20 Part A): captures, proposals, cancellation events, and the RPCs that make
-- approve / reject / status change one transaction each. Rules: specs/logic-spec.md §4, D12.
-- RPCs are security invoker with an empty search_path: RLS still applies to every statement inside.

create type public.capture_status as enum ('pending', 'approved', 'rejected');
create type public.capture_input as enum ('text', 'upload', 'paste', 'seed');
create type public.subscription_event_kind as enum ('cancelled', 'reopened');
create type public.cancel_channel as enum ('website_app', 'email', 'phone', 'letter', 'in_person', 'other');

-- New enum values cannot be used in the transaction that adds them; nothing below uses 'capture' as a
-- literal outside function bodies (checked at call time).
alter type public.entry_source add value 'capture';

-- Composite FK target on subscriptions (proposals, events); must exist before those tables.
alter table public.subscriptions add constraint subscriptions_id_user_id_key unique (id, user_id);

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  input public.capture_input not null,
  raw_text text,
  storage_path text,
  mime_type text,
  received_at timestamptz not null default now(),
  -- Raw model output, kept for the "what the model read" link. Written by the extraction step (Part B).
  extraction jsonb,
  extraction_error text,
  unique (id, user_id)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  capture_id uuid not null,
  status public.capture_status not null default 'pending',

  -- Draft fields: all nullable, including name. Extraction returns null rather than guessing.
  name text check (name is null or length(trim(name)) > 0),
  amount numeric(10, 2) check (amount >= 0),
  currency public.currency,
  billing_cycle public.billing_cycle,
  last_renewal_date date,
  trial_ends date,
  cancel_notice_days int check (cancel_notice_days between 0 and 365),
  regular_price numeric(10, 2) check (regular_price >= 0),
  promo_ends date,
  category_id uuid,
  payment_method_id uuid,
  scope public.scope,
  confidence public.confidence,
  vendor text,
  plan text,
  cancel_url text,
  notes text,
  -- {"amountCents": "high", "category": "low", ...}; a key with no entry was not extracted.
  field_confidence jsonb not null default '{}',

  -- Set when vendor + amount match an existing subscription: approving updates it instead of inserting.
  updates_subscription_id uuid,
  -- The row created or updated on approval.
  subscription_id uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),

  -- No amount-needs-currency check here (unlike subscriptions): a sparse capture may state an amount and no currency (P3).
  constraint proposals_promo_both_or_neither check ((regular_price is null) = (promo_ends is null)),
  constraint proposals_decided_at_matches_status check ((status = 'pending') = (decided_at is null)),
  constraint proposals_field_confidence_object check (jsonb_typeof(field_confidence) = 'object'),
  unique (id, user_id),
  constraint proposals_capture_fk foreign key (capture_id, user_id)
    references public.captures (id, user_id) on delete cascade,
  constraint proposals_category_fk foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  constraint proposals_payment_method_fk foreign key (payment_method_id, user_id)
    references public.payment_methods (id, user_id) on delete set null (payment_method_id),
  constraint proposals_updates_subscription_fk foreign key (updates_subscription_id, user_id)
    references public.subscriptions (id, user_id) on delete set null (updates_subscription_id),
  constraint proposals_subscription_fk foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id) on delete set null (subscription_id)
);

-- Composite FK targets on subscriptions (proposals, events) and the link back to the original capture.
alter table public.subscriptions add column capture_id uuid;
alter table public.subscriptions add constraint subscriptions_capture_fk foreign key (capture_id, user_id)
  references public.captures (id, user_id) on delete set null (capture_id);

-- Cancellation record (D12). Append-only for users: no update or delete policy or grant.
create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subscription_id uuid not null,
  kind public.subscription_event_kind not null,
  -- When it happened with the vendor (user-supplied, may be corrected), not when it was recorded.
  occurred_on date not null,
  channel public.cancel_channel,
  reference text check (reference is null or length(reference) <= 100),
  note text,
  capture_id uuid,
  recorded_at timestamptz not null default now(),
  constraint subscription_events_cancelled_needs_channel check (kind <> 'cancelled' or channel is not null),
  constraint subscription_events_subscription_fk foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id) on delete cascade,
  constraint subscription_events_capture_fk foreign key (capture_id, user_id)
    references public.captures (id, user_id) on delete set null (capture_id)
);

create index captures_user_id_idx on public.captures (user_id);
create index proposals_user_id_idx on public.proposals (user_id);
create index proposals_capture_id_idx on public.proposals (capture_id);
create index subscription_events_user_id_idx on public.subscription_events (user_id);
create index subscription_events_subscription_id_idx on public.subscription_events (subscription_id);
create index subscriptions_capture_id_idx on public.subscriptions (capture_id);

-- Row level security
alter table public.captures enable row level security;
alter table public.proposals enable row level security;
alter table public.subscription_events enable row level security;

create policy captures_select on public.captures for select to authenticated
  using ((select auth.uid()) = user_id);
create policy captures_insert on public.captures for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy captures_delete on public.captures for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy proposals_select on public.proposals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy proposals_insert on public.proposals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy proposals_update on public.proposals for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy subscription_events_select on public.subscription_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy subscription_events_insert on public.subscription_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Grants. service_role (local scripts only) gets everything, including delete on proposals and events for resets.
revoke all on public.captures, public.proposals, public.subscription_events from anon, authenticated;
grant all on public.captures, public.proposals, public.subscription_events to service_role;
grant select, insert, delete on public.captures to authenticated;
grant select, insert, update on public.proposals to authenticated;
grant select, insert on public.subscription_events to authenticated;

-- approve_proposal: one transaction. Locks the pending proposal, inserts a new subscription from p_fields
-- (source 'capture', capture_id = the proposal's capture) or updates updates_subscription_id, then marks
-- the proposal approved. p_fields: snake_case keys of SubscriptionFormData.
--   Insert: user_id comes from the column default (auth.uid()); status is always confirmed; access_until
--           is not accepted (a capture never creates a cancelled row).
--   Update: only keys present in p_fields are changed (a JSON null clears the field); status and
--           access_until are never changed here (use set_subscription_status).
create function public.approve_proposal(p_proposal_id uuid, p_fields jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prop public.proposals;
  v_sub_id uuid;
begin
  if p_fields is null or pg_catalog.jsonb_typeof(p_fields) <> 'object' then
    raise exception 'p_fields must be a JSON object' using errcode = '22023';
  end if;

  select * into v_prop from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'Proposal not found' using errcode = 'P0002';
  end if;
  if v_prop.status <> 'pending' then
    raise exception 'Proposal is not pending (%)', v_prop.status using errcode = '55000';
  end if;

  if v_prop.updates_subscription_id is not null then
    update public.subscriptions s set
      name = case when p_fields ? 'name' then p_fields ->> 'name' else s.name end,
      amount = case when p_fields ? 'amount' then (p_fields ->> 'amount')::numeric else s.amount end,
      currency = case when p_fields ? 'currency' then (p_fields ->> 'currency')::public.currency else s.currency end,
      billing_cycle = case when p_fields ? 'billing_cycle' then (p_fields ->> 'billing_cycle')::public.billing_cycle else s.billing_cycle end,
      last_renewal_date = case when p_fields ? 'last_renewal_date' then (p_fields ->> 'last_renewal_date')::date else s.last_renewal_date end,
      trial_ends = case when p_fields ? 'trial_ends' then (p_fields ->> 'trial_ends')::date else s.trial_ends end,
      cancel_notice_days = case when p_fields ? 'cancel_notice_days' then (p_fields ->> 'cancel_notice_days')::int else s.cancel_notice_days end,
      regular_price = case when p_fields ? 'regular_price' then (p_fields ->> 'regular_price')::numeric else s.regular_price end,
      promo_ends = case when p_fields ? 'promo_ends' then (p_fields ->> 'promo_ends')::date else s.promo_ends end,
      category_id = case when p_fields ? 'category_id' then (p_fields ->> 'category_id')::uuid else s.category_id end,
      payment_method_id = case when p_fields ? 'payment_method_id' then (p_fields ->> 'payment_method_id')::uuid else s.payment_method_id end,
      scope = case when p_fields ? 'scope' then (p_fields ->> 'scope')::public.scope else s.scope end,
      confidence = case when p_fields ? 'confidence' then (p_fields ->> 'confidence')::public.confidence else s.confidence end,
      vendor = case when p_fields ? 'vendor' then p_fields ->> 'vendor' else s.vendor end,
      plan = case when p_fields ? 'plan' then p_fields ->> 'plan' else s.plan end,
      cancel_url = case when p_fields ? 'cancel_url' then p_fields ->> 'cancel_url' else s.cancel_url end,
      notes = case when p_fields ? 'notes' then p_fields ->> 'notes' else s.notes end,
      capture_id = coalesce(s.capture_id, v_prop.capture_id)
    where s.id = v_prop.updates_subscription_id
    returning s.id into v_sub_id;
    if v_sub_id is null then
      raise exception 'Subscription to update not found' using errcode = 'P0002';
    end if;
  else
    insert into public.subscriptions (
      name, amount, currency, billing_cycle, last_renewal_date, trial_ends, cancel_notice_days,
      regular_price, promo_ends, category_id, payment_method_id, scope, confidence,
      vendor, plan, cancel_url, notes, source, capture_id
    ) values (
      p_fields ->> 'name',
      (p_fields ->> 'amount')::numeric,
      (p_fields ->> 'currency')::public.currency,
      (p_fields ->> 'billing_cycle')::public.billing_cycle,
      (p_fields ->> 'last_renewal_date')::date,
      (p_fields ->> 'trial_ends')::date,
      (p_fields ->> 'cancel_notice_days')::int,
      (p_fields ->> 'regular_price')::numeric,
      (p_fields ->> 'promo_ends')::date,
      (p_fields ->> 'category_id')::uuid,
      (p_fields ->> 'payment_method_id')::uuid,
      (p_fields ->> 'scope')::public.scope,
      (p_fields ->> 'confidence')::public.confidence,
      p_fields ->> 'vendor',
      p_fields ->> 'plan',
      p_fields ->> 'cancel_url',
      p_fields ->> 'notes',
      'capture',
      v_prop.capture_id
    )
    returning id into v_sub_id;
  end if;

  update public.proposals
    set status = 'approved', subscription_id = v_sub_id, decided_at = pg_catalog.now()
    where id = v_prop.id;

  return v_sub_id;
end;
$$;

create function public.reject_proposal(p_proposal_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.capture_status;
begin
  select status into v_status from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'Proposal not found' using errcode = 'P0002';
  end if;
  if v_status <> 'pending' then
    raise exception 'Proposal is not pending (%)', v_status using errcode = '55000';
  end if;
  update public.proposals
    set status = 'rejected', decided_at = pg_catalog.now()
    where id = p_proposal_id;
end;
$$;

-- set_subscription_status: status change and its event in one transaction (D12). "Today" is the user's
-- local date (profiles.time_zone, default Europe/Berlin, D8), so a cancellation recorded just after local
-- midnight is not "in the future" against the UTC date.
create function public.set_subscription_status(
  p_subscription_id uuid,
  p_status public.subscription_status,
  p_occurred_on date default null,
  p_channel public.cancel_channel default null,
  p_reference text default null,
  p_note text default null,
  p_capture_id uuid default null,
  p_access_until date default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old public.subscription_status;
  v_tz text;
  v_today date;
begin
  select status into v_old from public.subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;
  if v_old = p_status then
    raise exception 'Status is already %', p_status using errcode = '55000';
  end if;

  -- Lets the guard trigger below accept this status change (transaction-local).
  perform pg_catalog.set_config('app.status_via_rpc', 'on', true);

  select time_zone into v_tz from public.profiles where user_id = (select auth.uid());
  v_today := (pg_catalog.now() at time zone coalesce(v_tz, 'Europe/Berlin'))::date;

  if p_status = 'cancelled' then
    if p_channel is null then
      raise exception 'A cancellation needs a channel' using errcode = '22023';
    end if;
    if p_occurred_on is null then
      raise exception 'A cancellation needs a date' using errcode = '22023';
    end if;
    if p_occurred_on > v_today then
      raise exception 'The cancellation date cannot be in the future' using errcode = '22023';
    end if;
    update public.subscriptions
      set status = 'cancelled', access_until = p_access_until
      where id = p_subscription_id;
    insert into public.subscription_events (subscription_id, kind, occurred_on, channel, reference, note, capture_id)
      values (p_subscription_id, 'cancelled', p_occurred_on, p_channel, p_reference, p_note, p_capture_id);
  else
    if p_occurred_on is not null and p_occurred_on > v_today then
      raise exception 'The date cannot be in the future' using errcode = '22023';
    end if;
    update public.subscriptions
      set status = 'confirmed', access_until = null
      where id = p_subscription_id;
    insert into public.subscription_events (subscription_id, kind, occurred_on, channel, reference, note, capture_id)
      values (p_subscription_id, 'reopened', coalesce(p_occurred_on, v_today), p_channel, p_reference, p_note, p_capture_id);
  end if;
end;
$$;

-- Guard (D12): a signed-in user changes status only through set_subscription_status, so no cancellation
-- exists without its event. Direct updates of status, or inserting an already cancelled row, are refused
-- for the authenticated role. Local scripts (service_role) may still seed cancelled rows.
create function public.guard_subscription_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and coalesce(pg_catalog.current_setting('app.status_via_rpc', true), '') <> 'on'
     and ((tg_op = 'INSERT' and new.status = 'cancelled')
          or (tg_op = 'UPDATE' and new.status is distinct from old.status)) then
    raise exception 'Change the status with set_subscription_status' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_subscription_status() from public, anon, authenticated;

create trigger subscriptions_guard_status
before insert or update on public.subscriptions
for each row execute function public.guard_subscription_status();

revoke all on function public.approve_proposal(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.reject_proposal(uuid) from public, anon, authenticated;
revoke all on function public.set_subscription_status(uuid, public.subscription_status, date, public.cancel_channel, text, text, uuid, date)
  from public, anon, authenticated;
grant execute on function public.approve_proposal(uuid, jsonb) to authenticated;
grant execute on function public.reject_proposal(uuid) to authenticated;
grant execute on function public.set_subscription_status(uuid, public.subscription_status, date, public.cancel_channel, text, text, uuid, date)
  to authenticated;
