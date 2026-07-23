-- Epic H1 (Parent Portal shell + link data shape) --
-- docs/ui-architecture/04_Parent_Portal.md's "New schema this
-- experience requires" section. The /parent shell itself (ParentLayout,
-- role-gated) already existed from Sprint 1's Application Shell work;
-- this migration is the remaining piece.
--
-- IMPORTANT SCOPE BOUNDARY (docs/ui-architecture/00_Overview.md's Open
-- Flags, and this session's explicit product-owner decision): parent-
-- student linking has a real child-privacy/consent question (COPPA/
-- FERPA-adjacent) that is NOT resolved here. This migration and its
-- paired API route (H2, POST /api/parent/link-request) only prove the
-- data shape -- a row can be created with status = 'pending' and
-- nothing else. There is deliberately no RLS path to 'verified' or
-- 'revoked' in this migration -- no update policy exists at all -- so
-- no parent can ever grant themselves access via this table alone.
-- A real verification/consent mechanism is a separate, future product
-- decision, not silently invented here.

create table public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'revoked')),
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

create index parent_links_parent_id_idx on public.parent_links (parent_id);
create index parent_links_student_id_idx on public.parent_links (student_id);

alter table public.parent_links enable row level security;

create policy "Parents can view their own link requests"
  on public.parent_links for select
  using (parent_id = auth.uid());

-- with check enforces status = 'pending' at the database layer, not
-- just in application code -- a parent cannot insert a pre-verified row
-- even if they bypass the API route entirely.
create policy "Parents can create their own link requests as pending"
  on public.parent_links for insert
  with check (parent_id = auth.uid() and status = 'pending');

-- A student can see who has requested to link to them (mirrors
-- class_students' "students can view their own class memberships"
-- read-only pattern) -- this does not grant the student any way to
-- approve/deny yet, since no update policy exists; it only makes the
-- pending request visible for whenever that approval flow is designed.
create policy "Students can view link requests referencing them"
  on public.parent_links for select
  using (student_id = auth.uid());
