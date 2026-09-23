-- Rollback for 0027_seed_ncert_cbse_class4_math_fractions.sql.
-- Deletes exactly the rows that migration inserted, by explicit id --
-- not a table truncate -- so this stays safe to run even if later seed
-- migrations have added unrelated content to these same tables by the
-- time this is run.
--
-- Order is child-before-parent (reverse of the forward insert order) so
-- this succeeds even without relying on the schema's `on delete cascade`
-- behavior.

delete from public.mastery_criteria where id in (
  'mc-understand-fraction-as-equal-parts',
  'mc-read-simple-fractions'
);

delete from public.teaching_strategies where id in (
  'ts-real-object-sharing'
);

delete from public.misconceptions where id in (
  'm-unequal-parts-as-fraction'
);

delete from public.concept_learning_objectives where (concept_id, learning_objective_id) in (
  ('understanding-fractions', 'lo-understand-fraction-as-equal-parts'),
  ('understanding-fractions', 'lo-read-simple-fractions')
);

delete from public.learning_objectives where id in (
  'lo-understand-fraction-as-equal-parts',
  'lo-read-simple-fractions'
);

delete from public.concept_relationships where (from_concept_id, to_concept_id, relationship_type) in (
  ('understanding-fractions', 'numerator-and-denominator', 'prerequisite_of'),
  ('numerator-and-denominator', 'equivalent-fractions', 'prerequisite_of'),
  ('equivalent-fractions', 'comparing-fractions', 'prerequisite_of'),
  ('comparing-fractions', 'fraction-word-problems', 'prerequisite_of')
);

delete from public.concepts where id in (
  'understanding-fractions',
  'numerator-and-denominator',
  'equivalent-fractions',
  'comparing-fractions',
  'fraction-word-problems'
);

delete from public.chapters where id in (
  'fractions'
);

delete from public.grades where id in (
  'mathematics-class-4'
);
