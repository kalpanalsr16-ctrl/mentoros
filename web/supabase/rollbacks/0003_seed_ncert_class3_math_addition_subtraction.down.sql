-- Rollback for 0003_seed_ncert_class3_math_addition_subtraction.sql.
-- Deletes exactly the rows that migration inserted, by explicit id --
-- not a table truncate -- so this stays safe to run even if later seed
-- migrations have added unrelated content (a second chapter, etc.) to
-- these same tables by the time this is run.
--
-- Order is child-before-parent (reverse of the forward insert order) so
-- this succeeds even without relying on the schema's `on delete cascade`
-- behavior.

delete from public.mastery_criteria where id in (
  'mc-add-no-regroup',
  'mc-add-regroup',
  'mc-sub-no-regroup',
  'mc-sub-regroup'
);

delete from public.teaching_strategies where id in (
  'ts-visual-place-value-add',
  'ts-visual-place-value-sub'
);

delete from public.misconceptions where id in (
  'm-carry-forgotten',
  'm-subtract-smaller-from-larger'
);

delete from public.concept_learning_objectives where (concept_id, learning_objective_id) in (
  ('addition-without-regrouping', 'lo-add-2digit-no-regroup'),
  ('addition-with-regrouping', 'lo-add-2digit-regroup'),
  ('subtraction-without-regrouping', 'lo-sub-2digit-no-regroup'),
  ('subtraction-with-regrouping', 'lo-sub-2digit-regroup'),
  ('addition-with-regrouping', 'lo-word-problem-add-sub'),
  ('subtraction-with-regrouping', 'lo-word-problem-add-sub')
);

delete from public.learning_objectives where id in (
  'lo-add-2digit-no-regroup',
  'lo-add-2digit-regroup',
  'lo-sub-2digit-no-regroup',
  'lo-sub-2digit-regroup',
  'lo-word-problem-add-sub'
);

delete from public.concept_relationships where (from_concept_id, to_concept_id, relationship_type) in (
  ('addition-without-regrouping', 'addition-with-regrouping', 'prerequisite_of'),
  ('subtraction-without-regrouping', 'subtraction-with-regrouping', 'prerequisite_of'),
  ('addition-without-regrouping', 'subtraction-without-regrouping', 'prerequisite_of'),
  ('addition-with-regrouping', 'subtraction-with-regrouping', 'builds_on')
);

delete from public.concepts where id in (
  'addition-without-regrouping',
  'addition-with-regrouping',
  'subtraction-without-regrouping',
  'subtraction-with-regrouping'
);

delete from public.chapters where id in (
  'give-and-take'
);

delete from public.grades where id in (
  'mathematics-class-3'
);

delete from public.subjects where id in (
  'mathematics'
);
