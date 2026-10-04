-- Optional account label (the login email or username used with the vendor), to tell apart several
-- subscriptions with the same vendor and to know which login to cancel with. Never a password.
-- approve_proposal is replaced unchanged except that it also carries account_label.

alter table public.subscriptions add column account_label text
  check (account_label is null or (length(trim(account_label)) > 0 and length(account_label) <= 200));
alter table public.proposals add column account_label text
  check (account_label is null or (length(trim(account_label)) > 0 and length(account_label) <= 200));

create or replace function public.approve_proposal(p_proposal_id uuid, p_fields jsonb)
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
      account_label = case when p_fields ? 'account_label' then p_fields ->> 'account_label' else s.account_label end,
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
      vendor, plan, cancel_url, notes, account_label, source, capture_id
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
      p_fields ->> 'account_label',
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
