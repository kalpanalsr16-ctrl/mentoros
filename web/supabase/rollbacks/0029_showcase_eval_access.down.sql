-- Reverses 0029_showcase_eval_access.sql: restores anonymous read of public eval runs.
drop policy if exists "Showcase accounts can view items of public eval runs" on public.eval_run_items;
drop policy if exists "Showcase accounts can view public eval runs" on public.eval_runs;

create policy "Anyone can view items of eval runs marked public"
  on public.eval_run_items for select
  using (run_id in (select id from public.eval_runs where is_public = true));

create policy "Anyone can view eval runs marked public"
  on public.eval_runs for select
  using (is_public = true);
