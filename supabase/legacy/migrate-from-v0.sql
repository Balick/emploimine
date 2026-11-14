-- Step 1 of the migration of a database created before the 2026 rewrite
-- (tables "offers" with camelCase text dates, and "emails").
--
--   1. Run THIS file in the Supabase SQL editor: it renames the old tables
--      and locks them (the old version let the public anon key read the
--      subscriber list and write offers).
--   2. Run supabase/migrations/20261114120000_init.sql (new schema).
--   3. Run `npm run migrate:legacy` with SUPABASE_SERVICE_ROLE_KEY set: it
--      copies the old offers (descriptions sanitized, old ids kept so that
--      existing links keep working) and the subscribers.
--   4. Check the site, then drop the old tables:
--        drop table public.offers_legacy, public.emails_legacy;

alter table public.offers rename to offers_legacy;
alter table public.emails rename to emails_legacy;

-- Remove every way for the public keys to reach the old data.
do $$
declare
  policy record;
begin
  for policy in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('offers_legacy', 'emails_legacy')
  loop
    execute format('drop policy %I on public.%I', policy.policyname, policy.tablename);
  end loop;
end $$;

alter table public.offers_legacy enable row level security;
alter table public.emails_legacy enable row level security;
revoke all on public.offers_legacy, public.emails_legacy from anon, authenticated;
