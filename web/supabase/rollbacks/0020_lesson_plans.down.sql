-- Rollback for 0020_lesson_plans.sql.

drop table if exists public.lesson_plans;
drop function if exists public.set_updated_at();
