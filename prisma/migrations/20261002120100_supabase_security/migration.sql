-- Supabase hardening: the app reads/writes only through Prisma on the server (postgres role, bypasses RLS).
-- Enabling RLS without policies blocks the anon/authenticated roles from reading tables via the Data API.
-- Remember to enable RLS on every new table in later migrations.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Storage buckets: public photos and private verification documents.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('media', 'media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
