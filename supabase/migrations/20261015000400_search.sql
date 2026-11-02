-- Search: structured filters in, a ranked and stored list of candidate ids out.
--
-- The brief never reaches SQL. The server turns it into a filters object whose values are
-- checked against search_vocabulary(), and the matching below is static SQL that reads those
-- values as parameters, so there is nothing for an injected string to break out of.
--
-- Each search stores its full ordered result list, so paging is a slice of a snapshot:
-- it is fast, it never re-runs the query, and every result appears exactly once.

create table public.searches (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  recruiter_id uuid references public.recruiters (user_id) on delete set null,
  brief        text not null,
  filters      jsonb not null,
  -- Parts of the brief the data cannot answer, as [{ "phrase", "reason" }]. Non-empty means no results.
  unsupported  jsonb not null default '[]',
  result_ids   text[] not null,
  created_at   timestamptz not null default now()
);
create index searches_company_created_idx on public.searches (company_id, created_at desc);

alter table public.searches enable row level security;
revoke all on public.searches from anon, authenticated;
grant select on public.searches to authenticated;

create policy "recruiters read their company's searches" on public.searches
  for select to authenticated using (company_id = (select private.current_company_id()));

-- jsonb helpers that tolerate missing or wrongly-typed keys.
create function private.jsonb_text_array(p jsonb)
returns text[]
language sql
immutable
as $$
  select case when jsonb_typeof(p) = 'array'
    then array(select jsonb_array_elements_text(p))
    else '{}'::text[] end
$$;

create function private.jsonb_int(p jsonb)
returns integer
language sql
immutable
as $$
  select case when jsonb_typeof(p) = 'number' then round((p #>> '{}')::numeric)::integer end
$$;

create function private.jsonb_bool(p jsonb)
returns boolean
language sql
immutable
as $$
  select case when jsonb_typeof(p) = 'boolean' then (p #>> '{}')::boolean end
$$;

-- True when the filters constrain anything. An empty filter set never matches everyone.
create function private.has_filters(f jsonb)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1 from jsonb_each(coalesce(f, '{}')) as kv
    where (jsonb_typeof(kv.value) = 'array' and jsonb_array_length(kv.value) > 0)
       or jsonb_typeof(kv.value) in ('number', 'boolean')
  )
$$;

-- Every list filter means "any of these" except skills_all ("all of these") and
-- skills_exclude ("none of these"). Ranking: candidates whose headline stack contains the
-- requested skills first, then people open to work (unless that was itself a filter), then
-- experience; id keeps the order stable.
create function private.match_candidate_ids(f jsonb)
returns text[]
language sql
stable
set search_path = ''
as $$
  with p as (
    select
      private.jsonb_text_array(f -> 'roles')                 as roles,
      private.jsonb_text_array(f -> 'seniorities')           as seniorities,
      private.jsonb_text_array(f -> 'cities')                as cities,
      private.jsonb_text_array(f -> 'skills_all')            as skills_all,
      private.jsonb_text_array(f -> 'skills_any')            as skills_any,
      private.jsonb_text_array(f -> 'skills_exclude')        as skills_exclude,
      private.jsonb_int(f -> 'min_years')                    as min_years,
      private.jsonb_int(f -> 'max_years')                    as max_years,
      private.jsonb_bool(f -> 'open_to_work')                as open_to_work,
      private.jsonb_text_array(f -> 'company_types_ever')    as company_types_ever,
      private.jsonb_text_array(f -> 'company_types_current') as company_types_current,
      private.jsonb_text_array(f -> 'companies_ever')        as companies_ever,
      private.jsonb_text_array(f -> 'companies_current')     as companies_current,
      private.jsonb_text_array(f -> 'schools')               as schools,
      private.jsonb_text_array(f -> 'degrees')               as degrees,
      private.jsonb_text_array(f -> 'fields')                as fields,
      private.jsonb_int(f -> 'min_graduation_year')          as min_graduation_year,
      private.jsonb_int(f -> 'max_graduation_year')          as max_graduation_year
  ),
  matched as (
    select
      c.id,
      3 * cardinality(array(
            select unnest(c.primary_skills)
            intersect
            select unnest(p.skills_all || p.skills_any)
          ))
        + case when p.open_to_work is null and c.open_to_work then 1 else 0 end
        + c.years_experience / 100.0 as score
    from public.candidates c
    cross join p
    where (cardinality(p.roles) = 0 or c.role = any (p.roles))
      and (cardinality(p.seniorities) = 0 or c.seniority = any (p.seniorities))
      and (cardinality(p.cities) = 0 or c.city = any (p.cities))
      and c.skills @> p.skills_all
      and (cardinality(p.skills_any) = 0 or c.skills && p.skills_any)
      and not (c.skills && p.skills_exclude)
      and (p.min_years is null or c.years_experience >= p.min_years)
      and (p.max_years is null or c.years_experience <= p.max_years)
      and (p.open_to_work is null or c.open_to_work = p.open_to_work)
      and (cardinality(p.companies_current) = 0 or c.current_company = any (p.companies_current))
      and (cardinality(p.company_types_ever) = 0 or exists (
            select 1 from public.experiences e
            where e.candidate_id = c.id and e.company_type = any (p.company_types_ever)))
      and (cardinality(p.company_types_current) = 0 or exists (
            select 1 from public.experiences e
            where e.candidate_id = c.id and e.end_year is null and e.company_type = any (p.company_types_current)))
      and (cardinality(p.companies_ever) = 0 or exists (
            select 1 from public.experiences e
            where e.candidate_id = c.id and e.company = any (p.companies_ever)))
      -- Education filters must all hold for the same degree ("a PhD from Stanford").
      and ((cardinality(p.schools) = 0 and cardinality(p.degrees) = 0 and cardinality(p.fields) = 0
            and p.min_graduation_year is null and p.max_graduation_year is null)
           or exists (
             select 1 from public.education ed
             where ed.candidate_id = c.id
               and (cardinality(p.schools) = 0 or ed.school = any (p.schools))
               and (cardinality(p.degrees) = 0 or ed.degree = any (p.degrees))
               and (cardinality(p.fields) = 0 or ed.field = any (p.fields))
               and (p.min_graduation_year is null or ed.graduation_year >= p.min_graduation_year)
               and (p.max_graduation_year is null or ed.graduation_year <= p.max_graduation_year)))
  )
  select coalesce(array_agg(id order by score desc, id), '{}') from matched
$$;

-- The card shown in result lists, in the order of p_ids.
create function private.candidate_cards(p_ids text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'full_name', c.full_name,
      'avatar_url', c.avatar_url,
      'headline', c.headline,
      'current_title', c.current_title,
      'current_company', c.current_company,
      'current_company_logo_url', c.current_company_logo_url,
      'role', c.role,
      'seniority', c.seniority,
      'years_experience', c.years_experience,
      'location', jsonb_build_object('city', c.city, 'state', c.state, 'country', c.country),
      'open_to_work', c.open_to_work,
      'skills', to_jsonb(c.skills)
    ) order by o.ord), '[]'::jsonb)
  from unnest(p_ids) with ordinality as o (id, ord)
  join public.candidates c on c.id = o.id
$$;

revoke all on function private.jsonb_text_array(jsonb) from public;
revoke all on function private.jsonb_int(jsonb) from public;
revoke all on function private.jsonb_bool(jsonb) from public;
revoke all on function private.has_filters(jsonb) from public;
revoke all on function private.match_candidate_ids(jsonb) from public;
revoke all on function private.candidate_cards(text[]) from public;
grant execute on function private.candidate_cards(text[]) to authenticated, service_role;

-- Running a search is three steps, called by the API server only:
--
--   begin_search   spends one search if the plan allows it (before any LLM call)
--   finish_search  matches, stores the result snapshot and returns the first page
--   refund_search  gives the search back if interpreting the brief failed
--
-- The plan check and the spend are a single conditional UPDATE. Concurrent searches for the
-- same company queue on that row's lock and each re-checks searches_used after the one before
-- it commits, so a free company can never get past its limit however many requests race, and
-- the losers are turned away before they cost an LLM call.
create function public.begin_search(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid boolean := private.company_is_paid(p_company_id);
  v_used integer;
begin
  update public.companies c
    set searches_used = c.searches_used + 1
    where c.id = p_company_id
      and (v_paid or c.searches_used < private.free_search_limit())
    returning c.searches_used into v_used;

  if not found then
    return jsonb_build_object('status', 'quota_exhausted');
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'plan', case when v_paid then 'paid' else 'free' end,
    'searches_remaining', case when v_paid then null else greatest(private.free_search_limit() - v_used, 0) end
  );
end
$$;

create function public.refund_search(p_company_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.companies set searches_used = greatest(searches_used - 1, 0) where id = p_company_id
$$;

create function public.finish_search(
  p_company_id   uuid,
  p_recruiter_id uuid,
  p_brief        text,
  p_filters      jsonb,
  p_unsupported  jsonb,
  p_page_size    integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids       text[];
  v_search_id uuid;
begin
  -- Returning nothing beats returning the wrong people: a brief with an unanswerable
  -- requirement, or with no usable requirement at all, matches no one.
  if jsonb_array_length(coalesce(p_unsupported, '[]')) > 0 or not private.has_filters(p_filters) then
    v_ids := '{}';
  else
    v_ids := private.match_candidate_ids(p_filters);
  end if;

  insert into public.searches (company_id, recruiter_id, brief, filters, unsupported, result_ids)
  values (p_company_id, p_recruiter_id, p_brief, p_filters, coalesce(p_unsupported, '[]'), v_ids)
  returning id into v_search_id;

  return jsonb_build_object(
    'search_id', v_search_id,
    'total', cardinality(v_ids),
    'results', private.candidate_cards(v_ids[1:p_page_size])
  );
end
$$;

revoke all on function public.begin_search(uuid) from public, anon, authenticated;
revoke all on function public.refund_search(uuid) from public, anon, authenticated;
revoke all on function public.finish_search(uuid, uuid, text, jsonb, jsonb, integer) from public, anon, authenticated;
grant execute on function public.begin_search(uuid) to service_role;
grant execute on function public.refund_search(uuid) to service_role;
grant execute on function public.finish_search(uuid, uuid, text, jsonb, jsonb, integer) to service_role;

-- One page of a stored search. SECURITY INVOKER: row level security decides whether the
-- caller may see this search at all, so another company's search id just returns null.
create function public.search_page(p_search_id uuid, p_page integer, p_page_size integer default 20)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'search_id', s.id,
    'brief', s.brief,
    'filters', s.filters,
    'unsupported', s.unsupported,
    'created_at', s.created_at,
    'page', p_page,
    'page_size', p_page_size,
    'total', cardinality(s.result_ids),
    'results', private.candidate_cards(
      s.result_ids[(p_page - 1) * p_page_size + 1 : p_page * p_page_size]
    )
  )
  from public.searches s
  where s.id = p_search_id
    and p_page between 1 and 100000
    and p_page_size between 1 and 100
$$;

revoke all on function public.search_page(uuid, integer, integer) from public, anon;
grant execute on function public.search_page(uuid, integer, integer) to authenticated, service_role;
