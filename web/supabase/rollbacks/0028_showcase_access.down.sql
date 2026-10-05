-- Reverses 0028_showcase_access.sql. Run only if the showcase is being removed.
drop trigger if exists profiles_showcase_access_immutable on public.profiles;
drop function if exists public.prevent_showcase_access_self_grant();
alter table public.profiles drop column if exists ai_showcase_access;
