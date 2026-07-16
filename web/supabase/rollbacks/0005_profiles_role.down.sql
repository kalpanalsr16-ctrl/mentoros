-- Rollback for 0005_profiles_role.sql.

alter table public.profiles drop column if exists role;
