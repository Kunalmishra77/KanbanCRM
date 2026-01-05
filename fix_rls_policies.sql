-- Fix RLS Policies for KanbanCRM
-- Run this in Supabase SQL Editor to fix the permission issues

-- Option 1: Disable RLS entirely for server-side access (simpler)
-- Since your app uses server-side authentication with Drizzle (not Supabase Auth),
-- RLS is not needed and can be disabled.

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails DISABLE ROW LEVEL SECURITY;

-- Storage bucket policies for uploads
-- First drop existing policies if they exist (ignore errors)
DROP POLICY IF EXISTS "Public Access to Invoices" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload to Invoices" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload to Documents" ON storage.objects;

-- Create storage policies for reading and uploading
CREATE POLICY "Allow public read access to invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

CREATE POLICY "Allow public insert access to invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Allow public read access to documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Allow public insert access to documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public read access to proposals"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposals');

CREATE POLICY "Allow public insert access to proposals"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proposals');

CREATE POLICY "Allow public read access to attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

CREATE POLICY "Allow public insert access to attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments');
