-- Golden-set evaluation runs (docs/evaluation-strategy-report.md Section 7's
-- top-named gap: "no committed golden dataset, no regression harness").
-- This is a teacher-triggered batch of real, labeled test questions sent
-- through the actual /api/chat pipeline -- not a new scoring mechanism.
-- Each item's scores come from the same Evaluation Agent that already
-- grades real student turns; this schema just groups a batch of synthetic
-- runs together and records pass/fail against a per-question threshold,
-- separately from real student traffic in `events`.
--
-- RLS follows the exact per-owner shape already used by `classes`
-- (0011_classes.sql): teacher_id = auth.uid(). The harness script
-- (scripts/run-golden-eval.mjs) writes with the service-role key, which
-- bypasses RLS, so the owning teacher_id is whichever teacher the run is
-- recorded under -- RLS here exists to scope *reads* (and any future
-- teacher-initiated writes), not to gate the harness itself.
create table public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Golden set run',
  status text not null default 'running' check (status in ('running', 'completed')),
  -- Deliberate, explicit opt-in for the recruiter-facing /eval showcase
  -- page: only rows the harness (or a teacher) marks public are ever
  -- readable without a session. Defaults false so a real teacher's own
  -- future eval runs are never accidentally exposed by this table just
  -- existing -- the harness sets this true because the golden set is
  -- synthetic, curriculum-only content with no student PII in it.
  is_public boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index eval_runs_teacher_id_idx on public.eval_runs (teacher_id);

alter table public.eval_runs enable row level security;

create policy "Teachers can view their own eval runs"
  on public.eval_runs for select
  using (teacher_id = auth.uid());

create policy "Anyone can view eval runs marked public"
  on public.eval_runs for select
  using (is_public = true);

create policy "Teachers can create their own eval runs"
  on public.eval_runs for insert
  with check (teacher_id = auth.uid());

create policy "Teachers can update their own eval runs"
  on public.eval_runs for update
  using (teacher_id = auth.uid());

create table public.eval_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.eval_runs (id) on delete cascade,
  golden_id text not null,
  question text not null,
  -- Nullable: unknown until the run actually happens -- the Router Agent
  -- decides Concept/Practice/Assessment from the question's phrasing at
  -- request time, not something the golden set declares up front. Rows
  -- are inserted with this null while `status = 'pending'` and filled in
  -- once the real pipeline call returns.
  source_agent text check (source_agent in ('Concept', 'Practice', 'Assessment')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'pass', 'fail', 'error')),
  trace_id uuid,
  latency_ms integer,
  overall_score smallint,
  groundedness_score smallint,
  accuracy_score smallint,
  safety_score smallint,
  hallucination_risk text check (hallucination_risk in ('Low', 'Medium', 'High')),
  response_excerpt text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index eval_run_items_run_id_idx on public.eval_run_items (run_id);

alter table public.eval_run_items enable row level security;

create policy "Teachers can view items in their own eval runs"
  on public.eval_run_items for select
  using (run_id in (select id from public.eval_runs where teacher_id = auth.uid()));

create policy "Anyone can view items of eval runs marked public"
  on public.eval_run_items for select
  using (run_id in (select id from public.eval_runs where is_public = true));

create policy "Teachers can insert items into their own eval runs"
  on public.eval_run_items for insert
  with check (run_id in (select id from public.eval_runs where teacher_id = auth.uid()));

create policy "Teachers can update items in their own eval runs"
  on public.eval_run_items for update
  using (run_id in (select id from public.eval_runs where teacher_id = auth.uid()));

-- Required for the dashboard's live-updating table: Supabase only streams
-- postgres_changes for tables explicitly added to this publication.
alter publication supabase_realtime add table public.eval_runs;
alter publication supabase_realtime add table public.eval_run_items;
