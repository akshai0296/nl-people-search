-- Billing state, driven only by Stripe webhook events (we never call Stripe).
--
-- A company is on the paid plan while any of its subscriptions is active. Each subscription
-- keeps the (created, rank) of the newest event applied to it, and an event is applied only if
-- it is newer, so an older event delivered late can never overwrite a newer state.
-- billing_events records every event id we have processed, which makes delivery idempotent.

create table public.subscriptions (
  id                 text primary key, -- Stripe subscription id (sub_...)
  company_id         uuid not null references public.companies (id) on delete cascade,
  customer_id        text,
  status             text not null,
  current_period_end timestamptz,
  last_event_id      text not null,
  last_event_created bigint not null, -- Stripe event.created (unix seconds)
  last_event_rank    smallint not null, -- tie-breaker for events created in the same second
  updated_at         timestamptz not null default now()
);
create index subscriptions_company_id_idx on public.subscriptions (company_id);

create table public.billing_events (
  id              text primary key, -- Stripe event id (evt_...)
  type            text not null,
  created         bigint not null,
  subscription_id text,
  company_id      uuid references public.companies (id) on delete set null,
  outcome         text not null default 'pending'
                    check (outcome in ('pending', 'applied', 'stale', 'ignored')),
  received_at     timestamptz not null default now()
);

-- No client access at all: plan information is exposed through public.my_plan() only.
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
revoke all on public.subscriptions, public.billing_events from anon, authenticated;

create function private.free_search_limit()
returns integer
language sql
immutable
as $$ select 1 $$;

create function private.company_is_paid(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.company_id = p_company_id and s.status in ('active', 'trialing')
  )
$$;

revoke all on function private.free_search_limit() from public;
revoke all on function private.company_is_paid(uuid) from public;
grant execute on function private.free_search_limit() to authenticated, service_role;
grant execute on function private.company_is_paid(uuid) to authenticated, service_role;

-- The caller's plan. Safe to expose: it only ever describes the caller's own company.
create function public.my_plan()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'plan', case when paid then 'paid' else 'free' end,
    'searches_remaining', case when paid then null else greatest(private.free_search_limit() - c.searches_used, 0) end,
    'searches_used', c.searches_used
  )
  from public.companies c
  cross join lateral (select private.company_is_paid(c.id) as paid) p
  where c.id = private.current_company_id()
$$;

revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated, service_role;

-- Applies one customer.subscription.* event. Returns what happened:
--   duplicate - this event id was already processed; nothing changes
--   ignored   - the event names no known company or subscription
--   stale     - a newer event for this subscription was already applied
--   applied   - the subscription now reflects this event
-- Runs in one transaction: if anything fails, the event is not recorded and Stripe's retry
-- will process it again.
create function public.apply_subscription_event(
  p_event_id           text,
  p_event_type         text,
  p_event_created      bigint,
  p_subscription_id    text,
  p_customer_id        text,
  p_company_slug       text,
  p_status             text,
  p_current_period_end bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_status     text;
  v_rank       smallint;
  v_rows       integer;
  v_outcome    text;
begin
  insert into public.billing_events (id, type, created, subscription_id)
  values (p_event_id, p_event_type, p_event_created, p_subscription_id)
  on conflict (id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 'duplicate';
  end if;

  select c.id into v_company_id from public.companies c where c.slug = p_company_slug;

  if v_company_id is null or p_subscription_id is null or p_status is null then
    update public.billing_events set outcome = 'ignored' where id = p_event_id;
    return 'ignored';
  end if;

  -- A deleted subscription is over, whatever status the payload carries.
  v_status := case when p_event_type = 'customer.subscription.deleted' then 'canceled' else p_status end;

  -- Same-second tie-break: lifecycle only moves forward (incomplete -> live -> ended).
  v_rank := case
    when v_status in ('canceled', 'incomplete_expired') then 2
    when v_status = 'incomplete' then 0
    else 1
  end;

  insert into public.subscriptions as s (
    id, company_id, customer_id, status, current_period_end,
    last_event_id, last_event_created, last_event_rank, updated_at
  )
  values (
    p_subscription_id, v_company_id, p_customer_id, v_status,
    case when p_current_period_end is null then null else to_timestamp(p_current_period_end) end,
    p_event_id, p_event_created, v_rank, now()
  )
  on conflict (id) do update set
    company_id = excluded.company_id,
    customer_id = excluded.customer_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    last_event_id = excluded.last_event_id,
    last_event_created = excluded.last_event_created,
    last_event_rank = excluded.last_event_rank,
    updated_at = now()
  where (s.last_event_created, s.last_event_rank) < (excluded.last_event_created, excluded.last_event_rank);
  get diagnostics v_rows = row_count;

  v_outcome := case when v_rows = 1 then 'applied' else 'stale' end;
  update public.billing_events
    set outcome = v_outcome, company_id = v_company_id
    where id = p_event_id;
  return v_outcome;
end
$$;

-- Records an event we don't act on, so repeats are still recognised.
create function public.record_ignored_billing_event(p_event_id text, p_event_type text, p_event_created bigint)
returns text
language sql
security definer
set search_path = ''
as $$
  with inserted as (
    insert into public.billing_events (id, type, created, outcome)
    values (p_event_id, p_event_type, p_event_created, 'ignored')
    on conflict (id) do nothing
    returning 1
  )
  select case when exists (select 1 from inserted) then 'ignored' else 'duplicate' end
$$;

revoke all on function public.apply_subscription_event(text, text, bigint, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.record_ignored_billing_event(text, text, bigint) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(text, text, bigint, text, text, text, text, bigint) to service_role;
grant execute on function public.record_ignored_billing_event(text, text, bigint) to service_role;
