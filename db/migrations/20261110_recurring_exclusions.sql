-- Additive and idempotent: lets a repeating "everyone in a team" task leave specific people out (e.g. the team head).
alter table recurring_tasks add column if not exists exclude_ids text[] not null default array[]::text[];
