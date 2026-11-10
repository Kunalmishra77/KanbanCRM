-- Personal notifications (request raised / needs approval / approved or rejected).
-- Idempotent. NOTE: production already had an empty notifications table of exactly this shape, so this is a no-op there.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id varchar(255) not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null default '',
  link text,
  is_read boolean not null default false,
  entity_type text,
  entity_id text,
  created_at timestamp not null default now()
);
create index if not exists idx_notifications_user on notifications (user_id, created_at);
create index if not exists idx_notifications_entity on notifications (entity_id);
alter table notifications enable row level security;
revoke all on notifications from anon, authenticated;
