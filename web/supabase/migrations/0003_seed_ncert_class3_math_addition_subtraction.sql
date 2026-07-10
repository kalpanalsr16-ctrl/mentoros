-- MentorOS M5A seed data: the same NCERT Class 3 Mathematics
-- "Give and Take" (addition/subtraction with regrouping) content
-- originally authored as an in-code static dataset for M3
-- (web/src/lib/knowledge/datasets/ncert-class3-math-addition-subtraction.ts,
-- removed in M5B once this seed replaces it). Content, not schema --
-- future chapters/subjects are additive seed migrations, not schema changes.

insert into public.subjects (id, name, curriculum_standard) values
  ('mathematics', 'Mathematics', 'NCERT');

insert into public.grades (id, subject_id, grade_level) values
  ('mathematics-class-3', 'mathematics', 'Class 3');

insert into public.chapters (id, grade_id, title, sequence) values
  ('give-and-take', 'mathematics-class-3', 'Give and Take (Addition and Subtraction)', 1);

insert into public.concepts (id, chapter_id, name, description) values
  ('addition-without-regrouping', 'give-and-take',
   'Addition without regrouping',
   'Adding two 2-digit numbers where no column sum reaches 10.'),
  ('addition-with-regrouping', 'give-and-take',
   'Addition with regrouping',
   'Adding two 2-digit numbers where a column sum reaches 10 or more, requiring a ten to be carried into the next column.'),
  ('subtraction-without-regrouping', 'give-and-take',
   'Subtraction without regrouping',
   'Subtracting a 2-digit number from another where every column''s top digit is at least as large as the bottom digit.'),
  ('subtraction-with-regrouping', 'give-and-take',
   'Subtraction with regrouping',
   'Subtracting a 2-digit number from another where a column''s top digit is smaller than the bottom digit, requiring a ten to be borrowed from the next column.');

insert into public.concept_relationships (from_concept_id, to_concept_id, relationship_type) values
  ('addition-without-regrouping', 'addition-with-regrouping', 'prerequisite_of'),
  ('subtraction-without-regrouping', 'subtraction-with-regrouping', 'prerequisite_of'),
  ('addition-without-regrouping', 'subtraction-without-regrouping', 'prerequisite_of'),
  ('addition-with-regrouping', 'subtraction-with-regrouping', 'builds_on');

insert into public.learning_objectives (id, statement, blooms_level) values
  ('lo-add-2digit-no-regroup', 'Add two 2-digit numbers without regrouping.', 'Apply'),
  ('lo-add-2digit-regroup', 'Add two 2-digit numbers with regrouping (carrying).', 'Apply'),
  ('lo-sub-2digit-no-regroup', 'Subtract a 2-digit number from another without regrouping.', 'Apply'),
  ('lo-sub-2digit-regroup', 'Subtract a 2-digit number from another with regrouping (borrowing).', 'Apply'),
  ('lo-word-problem-add-sub', 'Solve a real-world word problem by choosing and correctly applying addition or subtraction with regrouping.', 'Analyze');

insert into public.concept_learning_objectives (concept_id, learning_objective_id) values
  ('addition-without-regrouping', 'lo-add-2digit-no-regroup'),
  ('addition-with-regrouping', 'lo-add-2digit-regroup'),
  ('subtraction-without-regrouping', 'lo-sub-2digit-no-regroup'),
  ('subtraction-with-regrouping', 'lo-sub-2digit-regroup'),
  ('addition-with-regrouping', 'lo-word-problem-add-sub'),
  ('subtraction-with-regrouping', 'lo-word-problem-add-sub');

insert into public.misconceptions (id, concept_id, description, common_triggers) values
  ('m-carry-forgotten', 'addition-with-regrouping',
   'Adds each column independently and writes both digits of a two-digit column sum in place, without carrying the tens digit forward (e.g. treats 7+6=13 in the ones column as writing ''13'' directly instead of carrying the 1).',
   'Vertical addition problems where a column sum is 10 or greater.'),
  ('m-subtract-smaller-from-larger', 'subtraction-with-regrouping',
   'When a column''s top digit is smaller than the bottom digit, subtracts the smaller digit from the larger one regardless of position instead of borrowing (e.g. computes 42-17 as 35 by taking 7-2=5 instead of borrowing a ten).',
   'Vertical subtraction problems where a column''s top digit is smaller than the bottom digit.');

insert into public.teaching_strategies (id, concept_id, description, when_to_use) values
  ('ts-visual-place-value-add', 'addition-with-regrouping',
   'Use base-ten blocks or a place-value chart to physically show ten ones being bundled into one ten before introducing the standard carrying algorithm.',
   'First introduction to regrouping, or when the carry-forgotten misconception is detected.'),
  ('ts-visual-place-value-sub', 'subtraction-with-regrouping',
   'Use base-ten blocks to show ''breaking'' a ten into ones before subtracting, making borrowing a physical action rather than an abstract rule.',
   'First introduction to borrowing, or when the subtract-smaller-from-larger misconception is detected.');

insert into public.mastery_criteria (id, learning_objective_id, evidence_required) values
  ('mc-add-no-regroup', 'lo-add-2digit-no-regroup',
   '3 consecutive correct answers across at least 2 different digit pairs, with no computational errors.'),
  ('mc-add-regroup', 'lo-add-2digit-regroup',
   '3 consecutive correct answers on problems requiring at least one carry, with the carry correctly applied each time.'),
  ('mc-sub-no-regroup', 'lo-sub-2digit-no-regroup',
   '3 consecutive correct answers across at least 2 different digit pairs, with no computational errors.'),
  ('mc-sub-regroup', 'lo-sub-2digit-regroup',
   '3 consecutive correct answers on problems requiring at least one borrow, with the borrow correctly applied each time.');
