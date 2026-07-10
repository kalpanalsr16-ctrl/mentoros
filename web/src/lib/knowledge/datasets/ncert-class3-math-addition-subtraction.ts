import type { CurriculumDataset } from "@/lib/knowledge/static-curriculum-provider";

/**
 * First real dataset implementing 09_Curriculum_Foundation.md's model --
 * one representative chapter (NCERT Class 3 Mathematics, "Give and Take":
 * addition and subtraction with regrouping), authored as pedagogically
 * sound, standard elementary-math content in NCERT's style. This is an
 * approximation for review, not verbatim textbook text -- worth a real
 * curriculum-author pass before being trusted as authoritative at scale,
 * the same honesty standard M0-08's safety filter held itself to.
 */
export const ncertClass3MathAdditionSubtractionDataset: CurriculumDataset = {
  metadata: {
    board: "NCERT",
    grade: "Class 3",
    subject: "Mathematics",
    chapter: "Give and Take (Addition and Subtraction)",
  },

  concepts: [
    {
      id: "addition-without-regrouping",
      name: "Addition without regrouping",
      description:
        "Adding two 2-digit numbers where no column sum reaches 10.",
    },
    {
      id: "addition-with-regrouping",
      name: "Addition with regrouping",
      description:
        "Adding two 2-digit numbers where a column sum reaches 10 or more, requiring a ten to be carried into the next column.",
    },
    {
      id: "subtraction-without-regrouping",
      name: "Subtraction without regrouping",
      description:
        "Subtracting a 2-digit number from another where every column's top digit is at least as large as the bottom digit.",
    },
    {
      id: "subtraction-with-regrouping",
      name: "Subtraction with regrouping",
      description:
        "Subtracting a 2-digit number from another where a column's top digit is smaller than the bottom digit, requiring a ten to be borrowed from the next column.",
    },
  ],

  relationships: [
    {
      fromConceptId: "addition-without-regrouping",
      toConceptId: "addition-with-regrouping",
      type: "prerequisite_of",
    },
    {
      fromConceptId: "subtraction-without-regrouping",
      toConceptId: "subtraction-with-regrouping",
      type: "prerequisite_of",
    },
    {
      fromConceptId: "addition-without-regrouping",
      toConceptId: "subtraction-without-regrouping",
      type: "prerequisite_of",
    },
    {
      fromConceptId: "addition-with-regrouping",
      toConceptId: "subtraction-with-regrouping",
      type: "builds_on",
    },
  ],

  learningObjectives: [
    {
      id: "lo-add-2digit-no-regroup",
      statement: "Add two 2-digit numbers without regrouping.",
      bloomsLevel: "Apply",
      conceptIds: ["addition-without-regrouping"],
    },
    {
      id: "lo-add-2digit-regroup",
      statement: "Add two 2-digit numbers with regrouping (carrying).",
      bloomsLevel: "Apply",
      conceptIds: ["addition-with-regrouping"],
    },
    {
      id: "lo-sub-2digit-no-regroup",
      statement: "Subtract a 2-digit number from another without regrouping.",
      bloomsLevel: "Apply",
      conceptIds: ["subtraction-without-regrouping"],
    },
    {
      id: "lo-sub-2digit-regroup",
      statement:
        "Subtract a 2-digit number from another with regrouping (borrowing).",
      bloomsLevel: "Apply",
      conceptIds: ["subtraction-with-regrouping"],
    },
    {
      id: "lo-word-problem-add-sub",
      statement:
        "Solve a real-world word problem by choosing and correctly applying addition or subtraction with regrouping.",
      bloomsLevel: "Analyze",
      conceptIds: ["addition-with-regrouping", "subtraction-with-regrouping"],
    },
  ],

  misconceptions: [
    {
      id: "m-carry-forgotten",
      conceptId: "addition-with-regrouping",
      description:
        "Adds each column independently and writes both digits of a two-digit column sum in place, without carrying the tens digit forward (e.g. treats 7+6=13 in the ones column as writing '13' directly instead of carrying the 1).",
      commonTriggers:
        "Vertical addition problems where a column sum is 10 or greater.",
    },
    {
      id: "m-subtract-smaller-from-larger",
      conceptId: "subtraction-with-regrouping",
      description:
        "When a column's top digit is smaller than the bottom digit, subtracts the smaller digit from the larger one regardless of position instead of borrowing (e.g. computes 42-17 as 35 by taking 7-2=5 instead of borrowing a ten).",
      commonTriggers:
        "Vertical subtraction problems where a column's top digit is smaller than the bottom digit.",
    },
  ],

  teachingStrategies: [
    {
      id: "ts-visual-place-value-add",
      conceptId: "addition-with-regrouping",
      description:
        "Use base-ten blocks or a place-value chart to physically show ten ones being bundled into one ten before introducing the standard carrying algorithm.",
      whenToUse:
        "First introduction to regrouping, or when the carry-forgotten misconception is detected.",
    },
    {
      id: "ts-visual-place-value-sub",
      conceptId: "subtraction-with-regrouping",
      description:
        "Use base-ten blocks to show 'breaking' a ten into ones before subtracting, making borrowing a physical action rather than an abstract rule.",
      whenToUse:
        "First introduction to borrowing, or when the subtract-smaller-from-larger misconception is detected.",
    },
  ],

  masteryCriteria: [
    {
      id: "mc-add-no-regroup",
      learningObjectiveId: "lo-add-2digit-no-regroup",
      evidenceRequired:
        "3 consecutive correct answers across at least 2 different digit pairs, with no computational errors.",
    },
    {
      id: "mc-add-regroup",
      learningObjectiveId: "lo-add-2digit-regroup",
      evidenceRequired:
        "3 consecutive correct answers on problems requiring at least one carry, with the carry correctly applied each time.",
    },
    {
      id: "mc-sub-no-regroup",
      learningObjectiveId: "lo-sub-2digit-no-regroup",
      evidenceRequired:
        "3 consecutive correct answers across at least 2 different digit pairs, with no computational errors.",
    },
    {
      id: "mc-sub-regroup",
      learningObjectiveId: "lo-sub-2digit-regroup",
      evidenceRequired:
        "3 consecutive correct answers on problems requiring at least one borrow, with the borrow correctly applied each time.",
    },
  ],
};
