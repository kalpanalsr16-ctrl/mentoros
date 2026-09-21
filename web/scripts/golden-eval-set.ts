// Golden question set for scripts/run-golden-eval.ts.
//
// Every question targets the one curriculum chapter actually seeded in
// this database (0003_seed_ncert_class3_math_addition_subtraction.sql --
// NCERT Class 3 Math, "Give and Take"), so the Concept Agent has real
// content to ground its answer in instead of a thin/empty Knowledge
// Package. `sourceAgent` isn't declared here -- the Router Agent decides
// that for real from the question's phrasing, and the harness records
// whichever agent actually handled it.
//
// `minOverallScore` is the pass threshold against the Evaluation Agent's
// own `overallScore` (already safety-gated -- see
// docs/evaluation-strategy-report.md Section 4). Defaults to 70
// ("Acceptable" or better, per the documented quality bands).
export type GoldenQuestion = {
  id: string;
  question: string;
  minOverallScore?: number;
};

export const GOLDEN_EVAL_SET: GoldenQuestion[] = [
  {
    // Wording matters here: the concept-search fallback
    // (search_concept_id, 0002_curriculum_foundation.sql) trigram-matches
    // the Router Agent's extracted topic/subtopic against the concept's
    // exact `name` column only ("Addition without regrouping") -- natural
    // phrasing like "carry"/"borrow" doesn't match closely enough and the
    // turn silently falls back to an ungraded generic reply (confirmed by
    // tracing a real run's events: conceptResolved: false). Using the
    // curriculum's own term, "regrouping", is what actually exercises the
    // Concept Agent + Evaluation Agent path these questions are meant to
    // test.
    id: "concept-addition-no-regroup",
    question: "Can you explain addition without regrouping? For example, adding two 2-digit numbers where no column adds up to 10 or more.",
  },
  {
    id: "concept-addition-regroup",
    question: "Can you explain addition with regrouping? For example, why do we regroup when adding 48 + 37?",
  },
  {
    id: "concept-subtraction-no-regroup",
    question: "Can you explain subtraction without regrouping? For example, subtracting a 2-digit number from another when no regrouping is needed.",
  },
  {
    id: "concept-subtraction-regroup",
    question: "Can you explain subtraction with regrouping? For example, what happens when we regroup to subtract 42 - 17?",
  },
  {
    id: "practice-addition-regroup",
    question: "Give me a practice problem on addition with regrouping.",
  },
  {
    id: "practice-subtraction-no-regroup",
    question: "Can I try a subtraction problem that doesn't need borrowing?",
  },
  {
    id: "practice-word-problem",
    question: "Give me a word problem that uses both addition and subtraction with regrouping.",
  },
  {
    id: "assessment-addition-regroup",
    question: "Test me on addition with regrouping so I can see if I've got it.",
  },
  {
    id: "assessment-subtraction-regroup",
    question: "Quiz me on subtraction with regrouping.",
  },
  {
    id: "misconception-carry-forgotten",
    question: "I added 27 + 15 and got 32 by just adding each column separately. Is that right?",
  },
  {
    id: "off-topic-probe",
    // Deliberately outside the seeded curriculum -- a realistic case
    // where a low groundedness score is the *correct* outcome, not a
    // bug. Keeping one such item in the set is worth more for a demo
    // than an all-green run: it shows the evaluator actually catches
    // something instead of rubber-stamping every response.
    question: "What's the capital of France?",
    minOverallScore: 0,
  },
];
