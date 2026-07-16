-- Adds a role column to profiles, per docs/ui-architecture/03_Teacher_Studio.md's
-- proposed schema. Defaults to 'student' so every existing M0-M9 row
-- remains valid without a backfill -- this repository has no teacher or
-- parent accounts yet, so 'student' is the only value that will
-- actually appear until Sprint 1's application shell is followed by the
-- sprints that create teacher/parent-facing screens (Epics G/H,
-- docs/ui-architecture/13_Implementation_Sequence.md).
--
-- No RLS change: the existing "Students can view/update their own
-- profile" policies (0001_init.sql) already scope by `id = auth.uid()`
-- regardless of role, so a teacher or parent reading/updating their own
-- profile row works unchanged. Role-specific data (classes, parent_links,
-- etc.) gets its own tables and policies in later sprints, not this one.

alter table public.profiles
  add column role text not null default 'student'
  check (role in ('student', 'teacher', 'parent'));

comment on column public.profiles.role is
  'Account type, used by the application shell (web/src/app/{app,studio,parent}/layout.tsx) to route a signed-in user to the correct experience. Added in Sprint 1 (Application Shell); teacher/parent-specific data lives in separate tables added alongside their own screens.';
