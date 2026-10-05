-- Records which MentorOS version and which model produced an evaluation run
-- (docs/AI_SHOWCASE_ARCHITECTURE.md, Phase D). Both columns are nullable with
-- no default and no backfill: runs created before this migration keep NULL,
-- which the Evaluation Lab renders as "Legacy run / version not recorded" and
-- "Model not recorded". Historical values are not guessed.
--
-- version_label is the git short SHA the runner was started from (with a
-- "-dirty" suffix when the working tree had uncommitted changes). Prompt or
-- system-level versioning is not captured here.

alter table public.eval_runs
  add column version_label text,
  add column model text;
