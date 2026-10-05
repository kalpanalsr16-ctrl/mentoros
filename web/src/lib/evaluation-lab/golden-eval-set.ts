// Golden question set for scripts/run-golden-eval.ts.
//
// ONE source of truth for the golden set: the benchmark runner
// (scripts/run-golden-eval.ts) and the Evaluation Lab both import this file.
//
// Every question targets the published curriculum chapter in this database
// ("Give and Take", 0003_seed_ncert_class3_math_addition_subtraction.sql).
// `expectedAgent` is a HUMAN-AUTHORED expectation (ground truth). It is not
// model output and must never be presented as a verified system result. The
// Router's actual decision is recorded by the harness and compared to it.
//
// `minOverallScore` is the pass threshold against the Evaluation Agent's
// own `overallScore` (already safety-gated -- see
// docs/evaluation-strategy-report.md Section 4). Defaults to 70
// ("Acceptable" or better, per the documented quality bands).
/** The agent the Router should send this question to. Human-authored ground truth, not a model output. `null` means no curriculum agent is expected. */
export type ExpectedAgent = "Concept" | "Practice" | "Assessment";

export type GoldenQuestion = {
  id: string;
  question: string;
  expectedAgent: ExpectedAgent | null;
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
    expectedAgent: "Concept",
    question: "Can you explain addition without regrouping? For example, adding two 2-digit numbers where no column adds up to 10 or more.",
  },
  {
    id: "concept-addition-regroup",
    expectedAgent: "Concept",
    question: "Can you explain addition with regrouping? For example, why do we regroup when adding 48 + 37?",
  },
  {
    id: "concept-subtraction-no-regroup",
    expectedAgent: "Concept",
    question: "Can you explain subtraction without regrouping? For example, subtracting a 2-digit number from another when no regrouping is needed.",
  },
  {
    id: "concept-subtraction-regroup",
    expectedAgent: "Concept",
    question: "Can you explain subtraction with regrouping? For example, what happens when we regroup to subtract 42 - 17?",
  },
  {
    id: "practice-addition-regroup",
    expectedAgent: "Practice",
    question: "Give me a practice problem on addition with regrouping.",
  },
  {
    id: "practice-subtraction-no-regroup",
    expectedAgent: "Practice",
    question: "Can I try a subtraction problem that doesn't need borrowing?",
  },
  {
    id: "practice-word-problem",
    expectedAgent: "Practice",
    question: "Give me a word problem that uses both addition and subtraction with regrouping.",
  },
  {
    id: "assessment-addition-regroup",
    expectedAgent: "Assessment",
    question: "Test me on addition with regrouping so I can see if I've got it.",
  },
  {
    id: "assessment-subtraction-regroup",
    expectedAgent: "Assessment",
    question: "Quiz me on subtraction with regrouping.",
  },
  {
    id: "misconception-carry-forgotten",
    expectedAgent: "Concept",
    question: "I added 27 + 15 and got 32 by just adding each column separately. Is that right?",
  },
  {
    id: "off-topic-probe",
    expectedAgent: null,
    // Deliberately outside the seeded curriculum -- a realistic case
    // where a low groundedness score is the *correct* outcome, not a
    // bug. Keeping one such item in the set is worth more for a demo
    // than an all-green run: it shows the evaluator actually catches
    // something instead of rubber-stamping every response.
    question: "What's the capital of France?",
    minOverallScore: 0,
  },
];
