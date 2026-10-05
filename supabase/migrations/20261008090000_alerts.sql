-- Alerts (D10, D13, D14): Keep, alert mode per subscription, alert channel per user, and the log of
-- sent emails. See specs/todo/d21-23-alerts.md §3.

-- D13: Remind (default) or Keep quietly, per subscription. The offer to switch is shown at most once.
create type public.alert_mode as enum ('remind', 'quiet');
alter table public.subscriptions
  add column alert_mode public.alert_mode not null default 'remind',
  add column quiet_offer_shown_at timestamptz;

-- D14: in-app alerts always; email on top unless the user switches it off.
create type public.alert_channel as enum ('app', 'app_email');
alter table public.profiles
  add column alert_channel public.alert_channel not null default 'app_email';

-- Keep is logged next to cancellations, with the Cancel-by it applies to.
-- The check casts to text: a new enum value cannot be referenced as a literal in the transaction that adds it.
alter type public.subscription_event_kind add value 'kept';
alter table public.subscription_events
  add column cancel_by date,
  add constraint subscription_events_kept_needs_cancel_by check (kind::text <> 'kept' or cancel_by is not null);

-- Sets kept_for_cancel_by and records the event in one transaction. A repeat for the same Cancel-by is a
-- no-op (taps from an email and the app). Whether p_cancel_by is still the row's current Cancel-by is
-- checked by the caller, because Cancel-by is computed in TypeScript.
create function public.keep_renewal(p_subscription_id uuid, p_cancel_by date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.subscription_status;
  v_kept date;
  v_tz text;
begin
  select status, kept_for_cancel_by into v_status, v_kept
    from public.subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;
  if v_status <> 'confirmed' then
    raise exception 'Only an active subscription can be kept' using errcode = '55000';
  end if;
  if v_kept is not distinct from p_cancel_by then
    return;
  end if;

  select time_zone into v_tz from public.profiles where user_id = (select auth.uid());
  update public.subscriptions set kept_for_cancel_by = p_cancel_by where id = p_subscription_id;
  insert into public.subscription_events (subscription_id, kind, occurred_on, cancel_by)
    values (p_subscription_id, 'kept', (pg_catalog.now() at time zone coalesce(v_tz, 'Europe/Berlin'))::date, p_cancel_by);
end;
$$;

revoke all on function public.keep_renewal(uuid, date) from public, anon, authenticated;
grant execute on function public.keep_renewal(uuid, date) to authenticated;

-- One row per email alert sent (row, Cancel-by, offset), so a rerun never sends twice (E46).
-- Written only by the daily job (service role); users can read their own.
create table public.alert_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid not null,
  cancel_by date not null,
  alert_offset int not null check (alert_offset >= 0),
  sent_at timestamptz not null default now(),
  email_id text,
  unique (subscription_id, cancel_by, alert_offset),
  constraint alert_sends_subscription_fk foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id) on delete cascade
);

create index alert_sends_user_id_idx on public.alert_sends (user_id);

alter table public.alert_sends enable row level security;
create policy alert_sends_select on public.alert_sends for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.alert_sends from anon, authenticated;
grant all on public.alert_sends to service_role;
grant select on public.alert_sends to authenticated;
