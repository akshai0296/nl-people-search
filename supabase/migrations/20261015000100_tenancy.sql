-- Tenancy: companies and the recruiters who belong to them.
--
-- Isolation model: every company-owned row carries company_id, and RLS compares it
-- with private.current_company_id(), which is derived from the caller's JWT (auth.uid())
-- via the recruiters table. Nothing a client sends is trusted to name a company.

create schema if not exists private;
-- `private` is not in PostgREST's exposed schemas, so nothing in it is callable over HTTP.
grant usage on schema private to authenticated, service_role;

create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name          text not null,
  -- Lifetime count of searches run. Only changed by public.begin_search() / refund_search().
  searches_used integer not null default 0 check (searches_used >= 0),
  created_at    timestamptz not null default now()
);

create table public.recruiters (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name  text not null,
  created_at timestamptz not null default now()
);
create index recruiters_company_id_idx on public.recruiters (company_id);

-- The caller's company, or null for anyone who is not a recruiter.
-- SECURITY DEFINER so policies on other tables can read recruiters without recursion.
create function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.company_id from public.recruiters r where r.user_id = auth.uid()
$$;

create function private.is_recruiter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.recruiters r where r.user_id = auth.uid())
$$;

revoke all on function private.current_company_id() from public;
revoke all on function private.is_recruiter() from public;
grant execute on function private.current_company_id() to authenticated, service_role;
grant execute on function private.is_recruiter() to authenticated, service_role;

-- Row level security. Recruiters can read their own company and profile, never write.
alter table public.companies enable row level security;
alter table public.recruiters enable row level security;

revoke all on public.companies from anon, authenticated;
revoke all on public.recruiters from anon, authenticated;
grant select on public.companies to authenticated;
grant select on public.recruiters to authenticated;

create policy "recruiters read their own company"
  on public.companies for select to authenticated
  using (id = (select private.current_company_id()));

create policy "recruiters read their own profile"
  on public.recruiters for select to authenticated
  using (user_id = (select auth.uid()));
