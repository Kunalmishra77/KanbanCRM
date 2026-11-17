-- Who gave a story to its assignee (creator, or whoever last changed the assignee; repeating copies: the
-- task's creator). Additive: older app versions ignore the column.
alter table stories add column if not exists assigned_by varchar(255);

-- Fill it for existing stories: the person who created the story (from the activity log) ...
update stories s set assigned_by = a.user_id
from (select distinct on (entity_id) entity_id, user_id from activity_log
      where entity_type = 'story' and action = 'created' order by entity_id, created_at) a
where s.assigned_by is null and a.entity_id = s.id::text;

-- ... and for repeating copies, whoever set up the repeating task
update stories s set assigned_by = r.created_by
from recurring_tasks r
where s.assigned_by is null and s.recurring_task_id = r.id and r.created_by is not null;
