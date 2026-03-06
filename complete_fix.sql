-- Complete Fix for KanbanCRM Database & Storage
-- Run this in Supabase SQL Editor to fix story creation and file upload issues

-- ============================================
-- STEP 1: Disable RLS on all tables (since you use server-side auth, not Supabase Auth)
-- ============================================

ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.founder_investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.internal_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sent_emails DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create Storage Buckets (if they don't exist)
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('invoices', 'invoices', true),
  ('documents', 'documents', true),
  ('proposals', 'proposals', true),
  ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- STEP 3: Drop existing storage policies (to avoid conflicts)
-- ============================================

DO $$ 
BEGIN
  -- Drop all existing policies on storage.objects if they exist
  DROP POLICY IF EXISTS "Public Access to Invoices" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access to Documents" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access to Proposals" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access to Attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload to Invoices" ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload to Documents" ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload to Proposals" ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload to Attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to invoices" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public insert access to invoices" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to documents" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public insert access to documents" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to proposals" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public insert access to proposals" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public insert access to attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow all operations on storage" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors if policies don't exist
END $$;

-- ============================================
-- STEP 4: Create permissive storage policies
-- ============================================

-- Enable RLS on storage objects (required for policies to work)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create unified policy for all bucket operations
CREATE POLICY "Allow all storage operations"
ON storage.objects FOR ALL
USING (bucket_id IN ('invoices', 'documents', 'proposals', 'attachments'))
WITH CHECK (bucket_id IN ('invoices', 'documents', 'proposals', 'attachments'));

-- ============================================
-- STEP 5: Create Sessions Table for connect-pg-simple
-- ============================================

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- ============================================
-- VERIFICATION: Check the storage buckets exist
-- ============================================
SELECT id, name, public FROM storage.buckets WHERE id IN ('invoices', 'documents', 'proposals', 'attachments');
SELECT * FROM information_schema.tables WHERE table_name = 'sessions';
