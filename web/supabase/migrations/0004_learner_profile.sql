-- MentorOS M8: Learner Profile persistence.
-- Real implementation of the subset of 12_Learner_Profile_Model.md that
-- LearnerState (web/src/lib/learner/learner-state.ts) already models --
-- Identity (grade), Preferences (confidence, preferred learning style,
-- learning goals), and Concept Mastery. The full 11-category model
-- (emotional signals, achievement system, learning-behaviour analytics,
-- revision scheduling) is deliberately out of scope: nothing in this
-- codebase reads those fields yet, and building persistence ahead of a
-- consumer is exactly what M3-M7 have each avoided.
--
-- Unlike M5's curriculum tables (shared reference data, read-only from
-- the app), this is per-student OWNED data -- RLS mirrors
-- profiles/conversations/messages's auth.uid()-scoped pattern from
-- 0001_init.sql, not M5's "authenticated, read-only, no write policy"
-- shape. The app itself (running as the signed-in student, never a
-- service role) is what writes these rows, via Memory Agent's logic.

-- ============================================================
-- learner_profiles
-- One row per student. Created lazily (via upsert) the first time
-- Memory Agent has real evidence to record -- there's no signup-time
-- trigger for this table the way 0001_init.sql's handle_new_user()
-- creates `profiles`, since a learner profile only becomes meaningful
-- once real learning evidence exists.
-- ============================================================
create table public.learner_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  grade smallint,
  confidence text
    check (confidence in ('Low', 'Medium', 'High')),
  preferred_learning_style text
    check (preferred_learning_style in ('Visual', 'Conversational', 'StepByStep', 'ExampleFirst', 'PracticeFirst')),
  learning_goals text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learner_profiles enable row level security;

create policy "Students can view their own learner profile"
  on public.learner_profiles for select
  using (id = auth.uid());

create policy "Students can create their own learner profile"
  on public.learner_profiles for insert
  with check (id = auth.uid());

create policy "Students can update their own learner profile"
  on public.learner_profiles for update
  using (id = auth.uid());

-- ============================================================
-- learner_concept_mastery
-- One row per (student, concept). mastery_score is 0-1 (matching
-- LearnerState.masteryByConcept and Planning Agent's
-- HIGH_MASTERY_THRESHOLD, both already 0-1 scale) -- NOT the 0-100 scale
-- Assessment Agent's masteryScore uses; Memory Agent converts when
-- writing (see lib/agents/memory-agent.ts).
--
-- weakConceptIds/strongConceptIds are deliberately NOT columns here --
-- PostgresLearnerStateProvider derives them from mastery_score at read
-- time (below the same HIGH_MASTERY_THRESHOLD Planning Agent already
-- uses, and a LOW_MASTERY_THRESHOLD for weak), so they can never drift
-- out of sync with the mastery scores that actually justify them.
-- ============================================================
create table public.learner_concept_mastery (
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id text not null references public.concepts (id) on delete cascade,
  mastery_score numeric(4, 3) not null
    check (mastery_score >= 0 and mastery_score <= 1),
  attempts int not null default 0,
  last_practiced_at timestamptz,
  common_mistakes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, concept_id)
);

create index learner_concept_mastery_student_idx
  on public.learner_concept_mastery (student_id);

alter table public.learner_concept_mastery enable row level security;

create policy "Students can view their own concept mastery"
  on public.learner_concept_mastery for select
  using (student_id = auth.uid());

create policy "Students can create their own concept mastery rows"
  on public.learner_concept_mastery for insert
  with check (student_id = auth.uid());

create policy "Students can update their own concept mastery rows"
  on public.learner_concept_mastery for update
  using (student_id = auth.uid());
