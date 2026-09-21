-- Fixes a real bug from 0024: the Evaluation Agent's overallScore is a
-- weighted average (computeWeightedScore, evaluation-agent.ts) and can
-- land on a fractional value (88.15, 91.6, ...), but 0024 declared these
-- four columns `smallint` -- integers only. Every golden-eval item that
-- scored a whole number wrote fine; every item that scored a decimal
-- failed its UPDATE with "invalid input syntax for type smallint" and
-- was silently left stuck at status='running'. `numeric(5, 2)` matches
-- the precision the rest of this schema already uses for a fractional
-- 0-100-ish score (learner_profiles.mastery_score, 0004_learner_profile.sql,
-- uses numeric for the same reason).
alter table public.eval_run_items
  alter column overall_score type numeric(5, 2),
  alter column groundedness_score type numeric(5, 2),
  alter column accuracy_score type numeric(5, 2),
  alter column safety_score type numeric(5, 2);
