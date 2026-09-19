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
    id: "concept-addition-no-regroup",
    question: "Can you explain how to add two 2-digit numbers when neither column adds up to 10 or more?",
  },
  {
    id: "concept-addition-regroup",
    question: "Why do we carry a ten when adding two 2-digit numbers, like 48 + 37?",
  },
  {
    id: "concept-subtraction-no-regroup",
    question: "Explain how to subtract a 2-digit number from another when I don't need to borrow.",
  },
  {
    id: "concept-subtraction-regroup",
    question: "What does it mean to borrow a ten when subtracting, like in 42 - 17?",
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
