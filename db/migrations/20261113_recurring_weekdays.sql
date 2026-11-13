-- Repeating tasks on several chosen weekdays (M T W T F S S toggles). Additive only:
-- older rules keep their single "weekday", and older app versions ignore this column.
alter table recurring_tasks add column if not exists weekdays integer[];
