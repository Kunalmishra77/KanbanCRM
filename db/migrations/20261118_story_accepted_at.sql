-- Work somebody else assigns waits in "Assigned to me" until the assignee accepts it.
-- Additive; every existing story counts as already accepted so nothing disappears from anyone's board.
alter table stories add column if not exists accepted_at timestamptz;
update stories set accepted_at = coalesce(updated_at, created_at, now()) where accepted_at is null;
