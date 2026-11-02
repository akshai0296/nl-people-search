-- Candidates are shared by every recruiter. They are loaded from data/candidates.json
-- by scripts/seed.ts through private.load_candidates().

create table public.candidates (
  id                       text primary key,
  full_name                text not null,
  avatar_url               text,
  headline                 text not null,
  current_title            text not null,
  current_company          text not null,
  current_company_logo_url text,
  role                     text not null,
  seniority                text not null check (seniority in ('junior', 'mid', 'senior', 'staff')),
  years_experience         smallint not null check (years_experience between 0 and 80),
  city                     text not null,
  state                    text,
  country                  text not null,
  open_to_work             boolean not null,
  skills                   text[] not null default '{}',
  -- The skills named in the headline ("Frontend Engineer · React, CSS, Vue"): their main stack.
  -- Used only for ranking.
  primary_skills           text[] not null default '{}'
);

create index candidates_role_idx on public.candidates (role);
create index candidates_city_idx on public.candidates (city);
create index candidates_skills_idx on public.candidates using gin (skills);

create table public.experiences (
  candidate_id     text not null references public.candidates (id) on delete cascade,
  position         smallint not null, -- 0 is the most recent (current) job
  title            text not null,
  company          text not null,
  company_logo_url text,
  company_type     text not null check (company_type in ('startup', 'enterprise')),
  start_year       smallint not null,
  end_year         smallint, -- null while it is the current job
  description      text,
  primary key (candidate_id, position)
);
create index experiences_company_type_idx on public.experiences (company_type, candidate_id);
create index experiences_company_idx on public.experiences (company, candidate_id);

create table public.education (
  candidate_id    text not null references public.candidates (id) on delete cascade,
  position        smallint not null,
  school          text not null,
  degree          text not null,
  field           text not null,
  graduation_year smallint,
  primary key (candidate_id, position)
);
create index education_school_idx on public.education (school, candidate_id);

-- Read-only for recruiters; anonymous and non-recruiter accounts see nothing.
alter table public.candidates enable row level security;
alter table public.experiences enable row level security;
alter table public.education enable row level security;

revoke all on public.candidates, public.experiences, public.education from anon, authenticated;
grant select on public.candidates, public.experiences, public.education to authenticated;

create policy "recruiters read candidates" on public.candidates
  for select to authenticated using ((select private.is_recruiter()));
create policy "recruiters read experiences" on public.experiences
  for select to authenticated using ((select private.is_recruiter()));
create policy "recruiters read education" on public.education
  for select to authenticated using ((select private.is_recruiter()));

-- Idempotent bulk load from the candidates.json array. Runs as the database owner from the
-- seed script; not callable over the API (private schema, no grants).
create function private.load_candidates(p_data jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.candidates as t (
    id, full_name, avatar_url, headline, current_title, current_company,
    current_company_logo_url, role, seniority, years_experience, city, state, country,
    open_to_work, skills, primary_skills
  )
  select
    c ->> 'id',
    c ->> 'full_name',
    c ->> 'avatar_url',
    c ->> 'headline',
    c ->> 'current_title',
    c ->> 'current_company',
    c ->> 'current_company_logo_url',
    c ->> 'role',
    c ->> 'seniority',
    (c ->> 'years_experience')::smallint,
    c -> 'location' ->> 'city',
    c -> 'location' ->> 'state',
    c -> 'location' ->> 'country',
    (c ->> 'open_to_work')::boolean,
    array(select jsonb_array_elements_text(c -> 'skills')),
    array(
      select btrim(s)
      from unnest(string_to_array(split_part(c ->> 'headline', ' · ', 2), ',')) as s
      where btrim(s) <> ''
    )
  from jsonb_array_elements(p_data) as c
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    headline = excluded.headline,
    current_title = excluded.current_title,
    current_company = excluded.current_company,
    current_company_logo_url = excluded.current_company_logo_url,
    role = excluded.role,
    seniority = excluded.seniority,
    years_experience = excluded.years_experience,
    city = excluded.city,
    state = excluded.state,
    country = excluded.country,
    open_to_work = excluded.open_to_work,
    skills = excluded.skills,
    primary_skills = excluded.primary_skills;

  get diagnostics v_count = row_count;

  delete from public.experiences e
  using jsonb_array_elements(p_data) as c
  where e.candidate_id = c ->> 'id';

  insert into public.experiences (
    candidate_id, position, title, company, company_logo_url, company_type,
    start_year, end_year, description
  )
  select
    c ->> 'id',
    (x.ord - 1)::smallint,
    x.e ->> 'title',
    x.e ->> 'company',
    x.e ->> 'company_logo_url',
    x.e ->> 'company_type',
    (x.e ->> 'start_year')::smallint,
    (x.e ->> 'end_year')::smallint,
    x.e ->> 'description'
  from jsonb_array_elements(p_data) as c
  cross join lateral jsonb_array_elements(c -> 'experiences') with ordinality as x (e, ord);

  delete from public.education e
  using jsonb_array_elements(p_data) as c
  where e.candidate_id = c ->> 'id';

  insert into public.education (candidate_id, position, school, degree, field, graduation_year)
  select
    c ->> 'id',
    (x.ord - 1)::smallint,
    x.e ->> 'school',
    x.e ->> 'degree',
    x.e ->> 'field',
    (x.e ->> 'graduation_year')::smallint
  from jsonb_array_elements(p_data) as c
  cross join lateral jsonb_array_elements(c -> 'education') with ordinality as x (e, ord);

  analyze public.candidates;
  analyze public.experiences;
  analyze public.education;

  return v_count;
end
$$;

revoke all on function private.load_candidates(jsonb) from public;

-- Everything the data can be filtered by. The server builds the LLM's output schema from this,
-- so the model can only ever choose values that exist in the data.
create function public.search_vocabulary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'roles',
      (select coalesce(jsonb_agg(role order by role), '[]') from (select distinct role from public.candidates) t),
    'seniorities',
      (select coalesce(jsonb_agg(seniority order by array_position(array['junior', 'mid', 'senior', 'staff'], seniority)), '[]')
         from (select distinct seniority from public.candidates) t),
    'cities',
      (select coalesce(jsonb_agg(jsonb_build_object('city', city, 'state', state, 'country', country) order by city), '[]')
         from (select distinct city, state, country from public.candidates) t),
    'skills',
      (select coalesce(jsonb_agg(skill order by lower(skill)), '[]')
         from (select distinct unnest(skills) as skill from public.candidates) t),
    'company_types',
      (select coalesce(jsonb_agg(company_type order by company_type desc), '[]')
         from (select distinct company_type from public.experiences) t),
    'companies',
      (select coalesce(jsonb_agg(jsonb_build_object('name', company, 'company_type', company_type) order by company), '[]')
         from (select distinct company, company_type from public.experiences) t),
    'schools',
      (select coalesce(jsonb_agg(school order by school), '[]') from (select distinct school from public.education) t),
    'degrees',
      (select coalesce(jsonb_agg(degree order by array_position(array['BA', 'BS', 'MS', 'MBA', 'PhD'], degree), degree), '[]')
         from (select distinct degree from public.education) t),
    'fields',
      (select coalesce(jsonb_agg(field order by field), '[]') from (select distinct field from public.education) t),
    'years_experience',
      (select jsonb_build_object('min', min(years_experience), 'max', max(years_experience)) from public.candidates),
    'graduation_years',
      (select jsonb_build_object('min', min(graduation_year), 'max', max(graduation_year)) from public.education)
  )
$$;

revoke all on function public.search_vocabulary() from public, anon;
grant execute on function public.search_vocabulary() to authenticated, service_role;
