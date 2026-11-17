-- A repeating copy someone removed for a day: the background job must not create it again that day.
create table if not exists recurring_skips (
  recurring_task_id uuid not null references recurring_tasks(id) on delete cascade,
  user_id varchar(255) not null,
  occurrence_date varchar(10) not null,
  skipped_by varchar(255),
  created_at timestamptz not null default now(),
  primary key (recurring_task_id, user_id, occurrence_date)
);
-- Same lock-down as every other table: only the app (table owner) reads it
alter table recurring_skips enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on recurring_skips from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on recurring_skips from authenticated; end if;
end $$;
