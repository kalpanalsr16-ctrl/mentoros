-- Reverses 0030_eval_run_version_model.sql.
alter table public.eval_runs
  drop column if exists version_label,
  drop column if exists model;
