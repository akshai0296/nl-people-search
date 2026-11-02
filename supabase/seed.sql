-- The two tenants. Their recruiters (auth users) and the candidates are created by
-- scripts/seed.ts, which `make setup` runs right after `supabase db reset`.
insert into public.companies (slug, name) values
  ('acme', 'Acme'),
  ('globex', 'Globex')
on conflict (slug) do nothing;
