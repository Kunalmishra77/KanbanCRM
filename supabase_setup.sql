-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- User Management (syncing with auth.users if you use Supabase Auth, but creating the public.users table as defined in schema)
create table if not exists public.users (
  id varchar(255) primary key, -- Will match auth.uid() if using Supabase Auth
  email text unique,
  first_name text,
  last_name text,
  profile_image_url text,
  role text not null default 'editor',
  user_type text not null default 'employee',
  shareholding_percent numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id varchar(255) references public.users(id) not null,
  industry text not null,
  stage text not null default 'Warm',
  average_progress numeric not null default 0,
  expected_revenue numeric not null default 0,
  revenue_total numeric not null default 0,
  notes text,
  proposal_file_name text,
  proposal_file_data text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Stories
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  assigned_to varchar(255) references public.users(id),
  priority text not null default 'Medium',
  estimated_effort_hours integer not null default 0,
  due_date timestamp with time zone not null,
  status text not null default 'To Do',
  progress_percent integer not null default 0,
  person text not null default '',
  tags text[] default array[]::text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade not null,
  author_id varchar(255) not null,
  author_name varchar(255),
  body text not null,
  is_system boolean not null default false,
  attachment_name text,
  attachment_type text,
  attachment_data text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activity Log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  user_id varchar(255) references public.users(id) not null,
  details text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  label text not null,
  amount numeric not null,
  issued_on timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'pending',
  file_name text,
  file_type text,
  file_data text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Founder Investments
create table if not exists public.founder_investments (
  id uuid primary key default gen_random_uuid(),
  user_id varchar(255) references public.users(id) not null,
  amount numeric not null,
  description text,
  invested_on timestamp with time zone default timezone('utc'::text, now()) not null,
  file_name text,
  file_type text,
  file_data text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Internal Documents
create table if not exists public.internal_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  uploaded_by_id varchar(255) references public.users(id) not null,
  file_name text,
  file_type text,
  file_data text,
  external_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sent Emails
create table if not exists public.sent_emails (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  sent_by_id varchar(255) references public.users(id) not null,
  recipient_email text,
  recipient_name text,
  subject text not null,
  body text not null,
  status text not null default 'drafted',
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sessions (for express-session compatibility if needed, though usually redis is better, but schema had it)
create table if not exists public.sessions (
  sid varchar primary key,
  sess jsonb not null,
  expire timestamp(6) without time zone not null
);
create index if not exists "IDX_session_expire" on public.sessions (expire);


-- STORAGE BUCKETS
-- Create buckets for file storage
insert into storage.buckets (id, name, public)
values 
  ('invoices', 'invoices', true),
  ('documents', 'documents', true),
  ('proposals', 'proposals', true),
  ('attachments', 'attachments', true)
on conflict (id) do nothing;


-- RLS POLICIES (Simulating "seamless" access - WARNING: OPEN TO PUBLIC)
-- In a production app, you should replace 'true' with proper auth checks e.g., auth.uid() = user_id

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.stories enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.invoices enable row level security;
alter table public.founder_investments enable row level security;
alter table public.internal_documents enable row level security;
alter table public.sent_emails enable row level security;

-- Create ALL access policies for everyone (Public)
create policy "Allow all operations for everyone on users" on public.users for all using (true) with check (true);
create policy "Allow all operations for everyone on clients" on public.clients for all using (true) with check (true);
create policy "Allow all operations for everyone on stories" on public.stories for all using (true) with check (true);
create policy "Allow all operations for everyone on comments" on public.comments for all using (true) with check (true);
create policy "Allow all operations for everyone on activity_log" on public.activity_log for all using (true) with check (true);
create policy "Allow all operations for everyone on invoices" on public.invoices for all using (true) with check (true);
create policy "Allow all operations for everyone on founder_investments" on public.founder_investments for all using (true) with check (true);
create policy "Allow all operations for everyone on internal_documents" on public.internal_documents for all using (true) with check (true);
create policy "Allow all operations for everyone on sent_emails" on public.sent_emails for all using (true) with check (true);

-- Storage Policies
-- Allow public access to all buckets created above
create policy "Public Access to Invoices" on storage.objects for all using ( bucket_id = 'invoices' );
create policy "Public Access to Documents" on storage.objects for all using ( bucket_id = 'documents' );
create policy "Public Access to Proposals" on storage.objects for all using ( bucket_id = 'proposals' );
create policy "Public Access to Attachments" on storage.objects for all using ( bucket_id = 'attachments' );

-- Allow uploads to all buckets (Warning: Unrestricted uploads)
create policy "Public Upload to Invoices" on storage.objects for insert with check ( bucket_id = 'invoices' );
create policy "Public Upload to Documents" on storage.objects for insert with check ( bucket_id = 'documents' );
create policy "Public Upload to Proposals" on storage.objects for insert with check ( bucket_id = 'proposals' );
create policy "Public Upload to Attachments" on storage.objects for insert with check ( bucket_id = 'attachments' );
