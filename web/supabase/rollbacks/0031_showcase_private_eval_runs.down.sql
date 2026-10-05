-- Reverses 0031_showcase_private_eval_runs.sql: showcase accounts see public runs only.
drop policy if exists "Showcase accounts can view eval run items" on public.eval_run_items;
drop policy if exists "Showcase accounts can view eval runs" on public.eval_runs;

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

create policy "Showcase accounts can view public eval runs"
  on public.eval_runs for select
  using (
    is_public = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.ai_showcase_access
    )
  );
