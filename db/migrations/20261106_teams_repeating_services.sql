-- Adds teams, working days, repeating tasks and employee services (leave / WFH / overtime).
-- Purely additive: no existing column or row is changed or removed. Safe to run more than once.

alter table users  add column if not exists team text;
alter table users  add column if not exists work_pattern text not null default 'mon-sat';

alter table stories add column if not exists recurring_task_id uuid;
alter table stories add column if not exists occurrence_date varchar(10);
-- one generated story per rule, person and day (rows without a rule are unaffected: NULLs never collide)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stories_recurring_occurrence_key') then
    alter table stories add constraint stories_recurring_occurrence_key unique (recurring_task_id, assigned_to, occurrence_date);
  end if;
end $$;

create table if not exists recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'Medium',
  repeat text not null,
  weekday integer,
  month_day integer,
  due_time varchar(5),
  start_date varchar(10) not null,
  end_date varchar(10),
  active boolean not null default true,
  assignee_ids text[] not null default array[]::text[],
  team text,
  created_by varchar(255) references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_requests (
  id uuid primary key default gen_random_uuid(),
  user_id varchar(255) not null references users(id) on delete cascade,
  type text not null,
  start_date varchar(10) not null,
  end_date varchar(10) not null,
  hours numeric,
  reason text not null,
  status text not null default 'pending',
  decided_by varchar(255),
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_employee_requests_user  on employee_requests(user_id);
create index if not exists idx_employee_requests_dates on employee_requests(start_date);

-- same security posture as every other table: only the app server can read or write
alter table recurring_tasks   enable row level security;
alter table employee_requests enable row level security;
revoke all on recurring_tasks   from anon, authenticated;
revoke all on employee_requests from anon, authenticated;
