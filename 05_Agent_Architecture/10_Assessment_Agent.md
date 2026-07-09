# Assessment Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Teaching Layer

---

# Purpose

The Assessment Agent is responsible for evaluating learner understanding, measuring concept mastery, identifying misconceptions, and determining whether learning objectives have been achieved.

Unlike traditional examinations that focus primarily on scoring, the Assessment Agent evaluates how well a learner understands a concept and provides actionable insights for improving learning.

The Assessment Agent acts like an experienced teacher reviewing a student's work and deciding what they should learn next.

---

# Problem Statement

Correct answers alone do not indicate true understanding.

A learner may:

- Guess correctly
- Memorize procedures
- Make repeated conceptual mistakes
- Understand the idea but make arithmetic errors
- Solve familiar problems but struggle with new ones

The Assessment Agent evaluates both outcomes and reasoning to determine genuine learning.

---

# Responsibilities

The Assessment Agent is responsible for:

- Evaluating learner responses
- Measuring concept mastery
- Identifying misconceptions
- Providing constructive feedback
- Determining readiness to progress
- Recommending revision when necessary
- Sending learning evidence to downstream agents

---

# Out of Scope

The Assessment Agent does NOT:

- Explain concepts
- Retrieve educational content
- Generate practice questions
- Update learner profile
- Select teaching strategy

---

# Inputs

The Assessment Agent receives:

## Learner Response

- Text answer
- Voice answer
- Numerical answer
- Multiple-choice response
- Step-by-step solution

---

## Practice Context

- Original question
- Expected learning objective
- Difficulty level
- Hint history

---

## Learning Plan

- Success criteria
- Mastery threshold
- Assessment objective

---

## Personalization Profile

- Grade
- Learning style
- Preferred feedback style

---

## Context Object

- Current lesson
- Previous attempts
- Session history

---

# Outputs

The Assessment Agent produces an **Assessment Report**.

Example

```json
{
  "mastery_score": 82,
  "status": "Partially Mastered",
  "misconceptions": [
    "Equivalent fractions"
  ],
  "feedback": "Good understanding, but simplify fractions before comparing them.",
  "recommended_next_step": "Targeted Practice"
}
```

---

# Assessment Principles

Every assessment should:

- Measure understanding, not memorization
- Be constructive
- Encourage learning
- Identify misconceptions
- Guide future teaching
- Build learner confidence

Assessment is a learning tool, not merely an evaluation mechanism.

---

# Assessment Types

The Assessment Agent supports:

### Concept Check

Short understanding verification.

---

### Formative Assessment

Continuous evaluation during learning.

---

### Summative Assessment

End-of-topic evaluation.

---

### Diagnostic Assessment

Identify prior knowledge.

---

### Misconception Assessment

Reveal conceptual misunderstandings.

---

### Reflection Assessment

Ask learners to explain their reasoning.

---

# Evaluation Dimensions

Each learner response is evaluated across multiple dimensions.

## Correctness

Is the final answer correct?

---

## Conceptual Understanding

Does the learner understand why?

---

## Reasoning

Is the approach logically sound?

---

## Confidence

How confidently did the learner respond?

---

## Independence

Did the learner require hints?

---

## Consistency

Can the learner solve similar problems?

---

# Mastery Levels

| Score | Level |
|--------|-------|
| 90–100 | Mastered |
| 75–89 | Proficient |
| 60–74 | Developing |
| 40–59 | Needs Support |
| Below 40 | Beginner |

Mastery scores represent evidence-based estimates rather than absolute truth.

---

# Feedback Strategy

Feedback should always follow this structure.

1. Recognize effort
2. Identify strengths
3. Explain mistakes
4. Suggest improvement
5. Recommend next action

Example:

"You correctly identified equivalent fractions. The mistake occurred while simplifying the denominator. Let's practice one more example before moving forward."

---

# Misconception Detection

The Assessment Agent should identify common misconceptions.

Examples:

- Incorrect order of operations
- Fraction simplification errors
- Unit conversion mistakes
- Formula misuse
- Decimal place value confusion

Detected misconceptions become valuable input for the Reflection and Memory Agents.

---

# Progress Decision

Based on assessment results, the Assessment Agent recommends one of the following:

- Continue Learning
- Generate More Practice
- Return to Concept Explanation
- Start Revision
- Advance to Next Topic

---

# Events Consumed

- PracticeCompleted
- LearnerAnswerSubmitted
- HintRequested

---

# Events Produced

- AssessmentCompleted
- MasteryCalculated
- MisconceptionDetected
- RevisionRecommended
- ReflectionRequested

---

# State Access

## Read

- Learning State
- Practice State
- Session State
- Personalization State

## Write

- Assessment State

The Assessment Agent never updates the Learner Profile directly.

---

# Knowledge Access

Uses:

- Answer Key
- Rubrics
- Common Misconception Library
- Curriculum Standards
- Mastery Thresholds

---

# Prompt Strategy

The Assessment Agent reasons like an experienced teacher evaluating understanding rather than grading papers.

Before evaluating a response, it asks:

- What concept was being assessed?
- Did the learner demonstrate understanding?
- Is the mistake conceptual or procedural?
- What evidence supports the mastery estimate?
- What is the best next learning step?

The objective is to improve learning, not assign scores.

---

# Decision Logic

```
Receive Learner Response
        │
        ▼
Validate Answer
        │
        ▼
Evaluate Understanding
        │
        ▼
Detect Misconceptions
        │
        ▼
Calculate Mastery
        │
        ▼
Generate Feedback
        │
        ▼
Recommend Next Action
        │
        ▼
Publish AssessmentCompleted Event
```

---

# Failure Modes

Possible failures:

- Ambiguous learner response
- Incomplete answer
- Multiple valid solutions
- Incorrect misconception detection
- Overestimating mastery

---

# Recovery Strategy

If confidence is low:

- Ask a follow-up question.
- Request the learner to explain their reasoning.
- Recommend another practice question.

---

# Retry Strategy

Maximum retries: 2

If assessment remains inconclusive:

Escalate to a diagnostic assessment.

---

# Performance Targets

Assessment Latency:

<500 ms

Mastery Accuracy:

>90%

Misconception Detection Accuracy:

>90%

---

# Observability

Track:

- Assessment latency
- Mastery distribution
- Feedback quality
- Misconception frequency
- Assessment completion rate
- Hint dependency

---

# Evaluation Metrics

Measure:

- Mastery prediction accuracy
- Feedback usefulness
- Misconception precision
- Learning improvement after feedback
- Learner confidence growth

---

# Dependencies

Depends on:

- Practice Agent
- Planning Agent
- Personalization Agent
- Learning State

Supports:

- Reflection Agent
- Memory Agent
- Evaluation Agent

---

# Success Criteria

The Assessment Agent succeeds when:

- Learner understanding is accurately measured.
- Misconceptions are identified early.
- Feedback improves future performance.
- Mastery estimates reflect real learning.
- Assessment naturally guides the next stage of the learning journey.

---

# Future Enhancements

Future versions may support:

- Spoken answer evaluation
- Diagram-based assessment
- Mathematical proof evaluation
- Peer assessment
- AI-generated rubrics
- Adaptive oral examinations
- Real-time classroom assessment