-- Run once on the Supabase project (npm run db:secure). Safe to re-run.
--
-- Supabase exposes every table in the public schema through its REST API to anyone holding the
-- public anon key. This app never uses that API: it connects directly as the postgres role, which
-- bypasses row level security. So we turn RLS on for every table and give anon/authenticated no
-- access at all. Result: the database can only be reached through the app server.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

-- Tables created later must not be exposed either
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
