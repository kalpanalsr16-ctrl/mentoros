-- MentorOS Phase 1 vertical slice seed data: Class 4 Mathematics
-- (NCERT/CBSE board), "Fractions" chapter.
--
-- THIS IS SEED/DEMO CONTENT, NOT VERIFIED OFFICIAL NCERT/CBSE TEXTBOOK
-- MATERIAL. Concept names, descriptions, misconceptions, teaching
-- strategies and mastery criteria below were authored to exercise the
-- schema and the Phase 1 vertical slice end-to-end; they have not been
-- checked against an actual NCERT/CBSE Class 4 Mathematics textbook.
-- Every row this migration inserts carries a `source` value saying so.
-- Replace with verified curriculum content before this chapter is
-- treated as real product content for students.
--
-- Reuses the existing 'mathematics' subject (NCERT/CBSE board, per
-- 0026) rather than creating a new subjects row -- Class 3 and Class 4
-- Mathematics under the same board share one subject, two grades, per
-- the existing subjects->grades convention from
-- 0003_seed_ncert_class3_math_addition_subtraction.sql.
--
-- `status = 'draft'` throughout (chapter and concepts): every existing
-- reader of chapters/concepts (My Learning, the Learning Roadmap) only
-- ever queries `.eq('status', 'published')`, so this chapter is
-- guaranteed invisible to every current student-facing surface the
-- instant this migration runs. Flip to 'published' explicitly in the
-- Phase 2 migration that makes those surfaces grade/subject-aware --
-- not before, to avoid a Class 3 student's Roadmap/My Learning suddenly
-- showing an unfinished Class 4 chapter mixed in with their own.
-- (search_concept_id() was fixed in 0026 to also honor this for the
-- live chat's topic-resolution path.)
--
-- Only "Understanding Fractions" is fleshed out with learning
-- objectives/misconceptions/teaching strategies/mastery criteria, per
-- the approved vertical-slice scope. The other four concepts are
-- inserted as structural placeholders only, so the chapter looks like a
-- real 5-concept chapter rather than a single orphaned concept -- they
-- carry no pedagogical depth yet and are out of scope until the
-- vertical slice is validated.

insert into public.grades (id, subject_id, grade_level) values
  ('mathematics-class-4', 'mathematics', 'Class 4');

insert into public.chapters (id, grade_id, title, sequence, status, source) values
  ('fractions', 'mathematics-class-4', 'Fractions', 1, 'draft',
   'seed-demo, not verified against an official NCERT/CBSE textbook');

insert into public.concepts (id, chapter_id, name, description, status, source) values
  ('understanding-fractions', 'fractions',
   'Understanding Fractions',
   'Recognizing that a fraction represents equal parts of a whole, and reading simple fractions such as one-half, one-third, and one-fourth from a picture.',
   'draft', 'seed-demo, not verified against an official NCERT/CBSE textbook'),
  ('numerator-and-denominator', 'fractions',
   'Numerator & Denominator',
   'Placeholder concept for the Fractions chapter -- not built out in Phase 1.',
   'draft', 'seed-demo placeholder, not yet authored'),
  ('equivalent-fractions', 'fractions',
   'Equivalent Fractions',
   'Placeholder concept for the Fractions chapter -- not built out in Phase 1.',
   'draft', 'seed-demo placeholder, not yet authored'),
  ('comparing-fractions', 'fractions',
   'Comparing Fractions',
   'Placeholder concept for the Fractions chapter -- not built out in Phase 1.',
   'draft', 'seed-demo placeholder, not yet authored'),
  ('fraction-word-problems', 'fractions',
   'Fraction Word Problems',
   'Placeholder concept for the Fractions chapter -- not built out in Phase 1.',
   'draft', 'seed-demo placeholder, not yet authored');

insert into public.concept_relationships (from_concept_id, to_concept_id, relationship_type) values
  ('understanding-fractions', 'numerator-and-denominator', 'prerequisite_of'),
  ('numerator-and-denominator', 'equivalent-fractions', 'prerequisite_of'),
  ('equivalent-fractions', 'comparing-fractions', 'prerequisite_of'),
  ('comparing-fractions', 'fraction-word-problems', 'prerequisite_of');

insert into public.learning_objectives (id, statement, blooms_level) values
  ('lo-understand-fraction-as-equal-parts', 'Explain that a fraction represents equal parts of a whole.', 'Understand'),
  ('lo-read-simple-fractions', 'Read the fraction shown by a picture divided into equal parts (e.g. one-half, one-third, one-fourth).', 'Apply');

insert into public.concept_learning_objectives (concept_id, learning_objective_id) values
  ('understanding-fractions', 'lo-understand-fraction-as-equal-parts'),
  ('understanding-fractions', 'lo-read-simple-fractions');

insert into public.misconceptions (id, concept_id, description, common_triggers) values
  ('m-unequal-parts-as-fraction', 'understanding-fractions',
   'Treats any division of a shape into pieces as a valid fraction without checking the pieces are equal in size (e.g. calls a shape cut into two visibly unequal pieces "one-half and one-half").',
   'Visual fraction problems where a shape is divided into unequal-looking parts.');

insert into public.teaching_strategies (id, concept_id, description, when_to_use) values
  ('ts-real-object-sharing', 'understanding-fractions',
   'Use a familiar shareable object (e.g. a pizza or a chocolate bar) and physically divide it into equal parts before naming the fraction, so equal-sharing is established before the fraction notation is introduced.',
   'First introduction to fractions, or when the unequal-parts misconception is detected.');

insert into public.mastery_criteria (id, learning_objective_id, evidence_required) values
  ('mc-understand-fraction-as-equal-parts', 'lo-understand-fraction-as-equal-parts',
   '3 consecutive correct judgments of whether a divided shape shows equal or unequal parts, across different shapes.'),
  ('mc-read-simple-fractions', 'lo-read-simple-fractions',
   '3 consecutive correct answers naming the fraction shown by a shaded figure, across at least 2 different denominators (e.g. halves and thirds).');
