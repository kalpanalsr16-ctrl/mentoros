-- Security fix: 0005_profiles_role.sql added `role` to profiles but the
-- pre-existing "Students can update their own profile" policy
-- (0001_init.sql) is `using (id = auth.uid())` with no `with check` and
-- no column restriction. Since Postgres RLS UPDATE policies apply the
-- same condition to the new row when no `with check` is given, any
-- authenticated user can currently PATCH their own profile row with
-- role: 'teacher' (or 'parent') from the browser and gain access to
-- /studio -- a self-service privilege escalation. Found while wiring up
-- the demo teacher account (2026-09-18).
--
-- Fixed with a trigger rather than a `with check` clause: RLS's
-- `with check` only sees the incoming row, not the row being replaced,
-- so it can't express "role must stay the same as before" on its own.
-- The trigger compares old.role to new.role directly and only allows a
-- change when the request is authenticated as service_role (i.e. an
-- admin script using the service-role key, same path
-- create-demo-accounts.mjs used), not a student's own session.
create function public.prevent_profile_role_self_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role cannot be changed from a user session';
  end if;
  return new;
end;
$$;

create trigger profiles_role_immutable
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_self_escalation();
