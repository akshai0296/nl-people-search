-- Company-owned workspace data: shortlists and saved searches.
--
-- company_id is filled in from the caller's JWT by its column default, and clients are only
-- granted the columns they may write, so a client can neither choose nor change the company a
-- row belongs to. RLS then limits every read and write to the caller's company.

create table public.shortlists (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid default auth.uid() references public.recruiters (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shortlists_company_idx on public.shortlists (company_id, updated_at desc);

create table public.shortlist_members (
  shortlist_id uuid not null references public.shortlists (id) on delete cascade,
  candidate_id text not null references public.candidates (id) on delete cascade,
  added_by     uuid default auth.uid() references public.recruiters (user_id) on delete set null,
  added_at     timestamptz not null default now(),
  primary key (shortlist_id, candidate_id)
);
create index shortlist_members_candidate_idx on public.shortlist_members (candidate_id);

create table public.saved_briefs (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null default private.current_company_id() references public.companies (id) on delete cascade,
  brief      text not null check (char_length(brief) between 1 and 500),
  filters    jsonb not null check (jsonb_typeof(filters) = 'object'),
  created_by uuid default auth.uid() references public.recruiters (user_id) on delete set null,
  created_at timestamptz not null default now()
);
create index saved_briefs_company_idx on public.saved_briefs (company_id, created_at desc);

-- Keep a list's updated_at current when people are added or removed, so the most recently
-- used lists come first.
create function private.touch_shortlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shortlists
    set updated_at = now()
    where id = coalesce(new.shortlist_id, old.shortlist_id);
  return null;
end
$$;

create trigger shortlist_members_touch
  after insert or delete on public.shortlist_members
  for each row execute function private.touch_shortlist();

create function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger shortlists_set_updated_at
  before update on public.shortlists
  for each row execute function private.set_updated_at();

alter table public.shortlists enable row level security;
alter table public.shortlist_members enable row level security;
alter table public.saved_briefs enable row level security;

revoke all on public.shortlists, public.shortlist_members, public.saved_briefs from anon, authenticated;

grant select, delete on public.shortlists to authenticated;
grant insert (name), update (name) on public.shortlists to authenticated;

grant select, delete on public.shortlist_members to authenticated;
grant insert (shortlist_id, candidate_id) on public.shortlist_members to authenticated;

grant select, delete on public.saved_briefs to authenticated;
grant insert (brief, filters) on public.saved_briefs to authenticated;

create policy "read own company's shortlists" on public.shortlists
  for select to authenticated
  using (company_id = (select private.current_company_id()));
create policy "create shortlists for own company" on public.shortlists
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));
create policy "rename own company's shortlists" on public.shortlists
  for update to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));
create policy "delete own company's shortlists" on public.shortlists
  for delete to authenticated
  using (company_id = (select private.current_company_id()));

create policy "read members of own company's shortlists" on public.shortlist_members
  for select to authenticated
  using (exists (
    select 1 from public.shortlists s
    where s.id = shortlist_id and s.company_id = (select private.current_company_id())));
create policy "add to own company's shortlists" on public.shortlist_members
  for insert to authenticated
  with check (exists (
    select 1 from public.shortlists s
    where s.id = shortlist_id and s.company_id = (select private.current_company_id())));
create policy "remove from own company's shortlists" on public.shortlist_members
  for delete to authenticated
  using (exists (
    select 1 from public.shortlists s
    where s.id = shortlist_id and s.company_id = (select private.current_company_id())));

create policy "read own company's saved searches" on public.saved_briefs
  for select to authenticated
  using (company_id = (select private.current_company_id()));
create policy "save searches for own company" on public.saved_briefs
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));
create policy "delete own company's saved searches" on public.saved_briefs
  for delete to authenticated
  using (company_id = (select private.current_company_id()));

revoke all on function private.touch_shortlist() from public;
revoke all on function private.set_updated_at() from public;
