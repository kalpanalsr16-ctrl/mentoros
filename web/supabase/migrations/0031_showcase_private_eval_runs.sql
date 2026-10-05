-- Lets the authorized showcase account read every evaluation run, including
-- private ones (is_public = false), so the Evaluation Lab can show the fresh
-- benchmark without publishing it (docs/AI_SHOWCASE_ARCHITECTURE.md, Phase D).
--
-- Anonymous visitors still have no read access: 0029 removed the anon policy,
-- and nothing here adds one. Eval runs hold synthetic golden-set questions,
-- Router decisions, and Evaluation Agent judge scores. They hold no student
-- rows. Note that this also makes teacher-owned runs readable by showcase
-- accounts.

drop policy "Showcase accounts can view public eval runs" on public.eval_runs;

create policy "Showcase accounts can view eval runs"
  on public.eval_runs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.ai_showcase_access
    )
  );

drop policy "Showcase accounts can view items of public eval runs" on public.eval_run_items;

create policy "Showcase accounts can view eval run items"
  on public.eval_run_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.ai_showcase_access
    )
  );
