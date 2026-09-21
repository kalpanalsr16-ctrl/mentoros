alter table public.eval_run_items
  alter column overall_score type smallint using round(overall_score)::smallint,
  alter column groundedness_score type smallint using round(groundedness_score)::smallint,
  alter column accuracy_score type smallint using round(accuracy_score)::smallint,
  alter column safety_score type smallint using round(safety_score)::smallint;
