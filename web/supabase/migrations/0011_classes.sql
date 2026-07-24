-- Epic G1 (Teacher Studio shell + roster) -- docs/ui-architecture/
-- 03_Teacher_Studio.md's "New schema this experience requires" section.
-- The Studio shell itself (TeacherShell, role-gated /studio layout) was
-- already built in Sprint 1's Application Shell work; this migration is
-- the remaining piece -- the actual roster tables every later Teacher
-- Studio module (Dashboard, Class Overview, Student Overview,
-- Misconception Reports, Progress Analytics, Intervention Planner) reads.
--
-- RLS shape matches the doc's own proposal exactly: classes is a plain
-- per-owner table (teacher_id = auth.uid()), same shape every existing
-- table in this schema already uses. class_students needs both sides --
-- a teacher managing their own roster, and a student reading which
-- classes they belong to (needed so a student's own future screens could
-- show "your teacher" without a second table). The verification/invite
-- flow for actually populating class_students is explicitly out of scope
-- here (00_Overview.md's Open Flags) -- this migration only proves the
-- data shape and the teacher's own management path.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  grade smallint,
  created_at timestamptz not null default now()
);

create index classes_teacher_id_idx on public.classes (teacher_id);

alter table public.classes enable row level security;

create policy "Teachers can view their own classes"
  on public.classes for select
  using (teacher_id = auth.uid());

create policy "Teachers can create their own classes"
  on public.classes for insert
  with check (teacher_id = auth.uid());

create policy "Teachers can update their own classes"
  on public.classes for update
  using (teacher_id = auth.uid());

create table public.class_students (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create index class_students_student_id_idx on public.class_students (student_id);

alter table public.class_students enable row level security;

create policy "Teachers can view their own class rosters"
  on public.class_students for select
  using (class_id in (select id from public.classes where teacher_id = auth.uid()));

create policy "Teachers can add students to their own classes"
  on public.class_students for insert
  with check (class_id in (select id from public.classes where teacher_id = auth.uid()));

create policy "Teachers can remove students from their own classes"
  on public.class_students for delete
  using (class_id in (select id from public.classes where teacher_id = auth.uid()));

create policy "Students can view their own class memberships"
  on public.class_students for select
  using (student_id = auth.uid());
