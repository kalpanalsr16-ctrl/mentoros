-- Gates public evaluation results behind ai_showcase_access (0028).
--
-- 0024 made eval runs readable by anyone (including the anon key) when
-- is_public = true. The /eval page gate alone would leave the same rows
-- readable through PostgREST, so the policies themselves now also require
-- the showcase capability. Teacher policies are unchanged.
--
-- Side effect: the landing page (/) reads the same public run, so it shows
-- its empty state for signed-out visitors after this migration.

drop policy "Anyone can view eval runs marked public" on public.eval_runs;

create policy "Showcase accounts can view public eval runs"
  on public.eval_runs for select
  using (
    is_public = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.ai_showcase_access
    )
  );

drop policy "Anyone can view items of eval runs marked public" on public.eval_run_items;

create policy "Showcase accounts can view items of public eval runs"
  on public.eval_run_items for select
  using (
    exists (
      select 1 from public.eval_runs r
      where r.id = eval_run_items.run_id and r.is_public = true
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.ai_showcase_access
    )
  );
