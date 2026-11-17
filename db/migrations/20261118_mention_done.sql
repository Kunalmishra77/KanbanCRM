-- "Done" on an @mention that needs no reply (answered ones are worked out from the replies).
create table if not exists mention_done (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id varchar(255) not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table mention_done enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on mention_done from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on mention_done from authenticated; end if;
end $$;
