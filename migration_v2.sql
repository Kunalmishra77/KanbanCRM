-- Migration SQL for KanbanCRM (New Supabase Project)
-- Run this in the Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(255) PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  role TEXT NOT NULL DEFAULT 'editor',
  user_type TEXT NOT NULL DEFAULT 'employee',
  shareholding_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sessions Table (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- 4. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id),
  industry TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Warm',
  average_progress NUMERIC NOT NULL DEFAULT 0,
  expected_revenue NUMERIC NOT NULL DEFAULT 0,
  revenue_total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  proposal_file_name TEXT,
  proposal_file_data TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assigned_to VARCHAR(255) REFERENCES users(id),
  priority TEXT NOT NULL DEFAULT 'Medium',
  estimated_effort_hours INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'To Do',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  person TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  author_id VARCHAR(255) NOT NULL,
  author_name VARCHAR(255),
  body TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_story_id ON public.comments(story_id);

-- 7. Disable RLS for all tables (Serverless simplicity)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
-- Add more as needed (activity_log, invoices, etc. if you use them)

-- 8. Storage Buckets (Run if using Supabase Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true) ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
