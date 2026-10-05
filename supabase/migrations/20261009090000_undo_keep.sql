-- Undo a Keep (mistap, or the user wants reminders after all). The log stays append-only: the undo is
-- its own event, so the history shows both and the quiet offer counts only Keeps that stood (E44).

alter type public.subscription_event_kind add value 'keep_undone';

alter table public.subscription_events
  drop constraint subscription_events_kept_needs_cancel_by,
  add constraint subscription_events_kept_needs_cancel_by
    check (kind::text not in ('kept', 'keep_undone') or cancel_by is not null);

-- Clears kept_for_cancel_by and logs the undo with the Cancel-by it was kept for. No-op when not kept.
create function public.undo_keep(p_subscription_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_kept date;
  v_tz text;
begin
  select kept_for_cancel_by into v_kept
    from public.subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'Subscription not found' using errcode = 'P0002';
  end if;
  if v_kept is null then
    return;
  end if;

  select time_zone into v_tz from public.profiles where user_id = (select auth.uid());
  update public.subscriptions set kept_for_cancel_by = null where id = p_subscription_id;
  insert into public.subscription_events (subscription_id, kind, occurred_on, cancel_by)
    values (p_subscription_id, 'keep_undone', (pg_catalog.now() at time zone coalesce(v_tz, 'Europe/Berlin'))::date, v_kept);
end;
$$;

revoke all on function public.undo_keep(uuid) from public, anon, authenticated;
grant execute on function public.undo_keep(uuid) to authenticated;
