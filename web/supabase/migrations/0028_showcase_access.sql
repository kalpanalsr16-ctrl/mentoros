-- AI showcase authorization (docs/AI_SHOWCASE_ARCHITECTURE.md, sections 5-6).
--
-- A server-side capability: only accounts with ai_showcase_access = true may
-- open the showcase, the Flight Recorder (/explorer, /showcase/flight-recorder),
-- or the transparency trace APIs. Defaults false, so every existing and new
-- account is a normal student until a privileged script or SQL session grants it.
--
-- The existing "Students can update their own profile" policy (0001_init.sql)
-- allows any signed-in user to update their own row. The trigger below closes
-- that path for this column, in the same way 0023 does for role: a change from
-- a user session (anon/authenticated JWT) is rejected. Changes with the
-- service_role key, or from a direct database session with no JWT (the Supabase
-- SQL Editor), are allowed.

alter table public.profiles
  add column ai_showcase_access boolean not null default false;

comment on column public.profiles.ai_showcase_access is
  'Grants access to the AI showcase and Flight Recorder. Settable only by service_role or a direct database session, never from a user session (see prevent_showcase_access_self_grant).';

create function public.prevent_showcase_access_self_grant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.ai_showcase_access is distinct from old.ai_showcase_access
     and auth.role() is not null
     and auth.role() <> 'service_role' then
    raise exception 'ai_showcase_access cannot be changed from a user session';
  end if;
  return new;
end;
$$;

create trigger profiles_showcase_access_immutable
  before update on public.profiles
  for each row execute procedure public.prevent_showcase_access_self_grant();
