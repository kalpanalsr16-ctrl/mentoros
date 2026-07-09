# Reflection Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Learning Intelligence Layer

---

# Purpose

The Reflection Agent is responsible for interpreting learning evidence generated during a learning session and determining what the learner has actually understood, where misconceptions remain, and what should happen next.

Unlike the Assessment Agent, which measures learner performance, the Reflection Agent synthesizes all available evidence into meaningful educational insights.

It acts like an experienced teacher reflecting after a lesson to determine whether the learner is truly ready to move forward.

---

# Problem Statement

Assessment scores alone do not capture learning.

Two learners may both score 80%, but:

- One understood the concept deeply but made a calculation mistake.
- Another guessed correctly without understanding.
- A third relied heavily on hints.

Without reflection:

- Mastery estimates become unreliable.
- Revision recommendations become generic.
- Personalization stagnates.
- Long-term learning suffers.

The Reflection Agent transforms assessment data into learning intelligence.

---

# Responsibilities

The Reflection Agent is responsible for:

- Interpreting learning evidence
- Identifying conceptual understanding
- Detecting remaining misconceptions
- Measuring learning confidence
- Determining readiness to progress
- Recommending next learning actions
- Generating learning summaries for downstream agents

---

# Out of Scope

The Reflection Agent does NOT:

- Teach concepts
- Generate practice
- Retrieve knowledge
- Evaluate answers
- Update learner memory directly

---

# Inputs

The Reflection Agent receives:

## Assessment Report

- Mastery Score
- Misconceptions
- Feedback
- Recommended Next Step

---

## Practice Summary

- Questions Attempted
- Correct Answers
- Hint Usage
- Time Per Question

---

## Learning Session Summary

- Concepts Covered
- Activities Completed
- Teaching Strategies Used

---

## Learner Profile (Read Only)

- Historical Mastery
- Previous Weak Concepts
- Learning Goals

---

# Outputs

The Reflection Agent produces a **Learning Reflection Report**.

Example

```json
{
  "concept":"Equivalent Fractions",
  "learning_status":"Partially Mastered",
  "confidence":"Medium",
  "misconceptions":[
      "Fraction simplification"
  ],
  "recommended_action":"Additional Practice",
  "reflection_summary":"Learner understands the concept but needs reinforcement in simplification."
}
```

---

# Reflection Principles

Reflection should:

- Look beyond scores
- Focus on conceptual understanding
- Consider learner effort
- Detect learning patterns
- Recommend meaningful next steps

The Reflection Agent measures learning, not performance alone.

---

# Evidence Considered

Reflection combines evidence from multiple sources.

## Assessment

- Mastery
- Correctness
- Reasoning

---

## Practice

- Completion
- Hint dependency
- Difficulty progression

---

## Concept Learning

- Clarification requests
- Follow-up questions
- Explanation effectiveness

---

## Session Behaviour

- Persistence
- Engagement
- Confidence indicators

---

# Reflection Dimensions

The Reflection Agent evaluates:

## Conceptual Understanding

Does the learner understand the underlying concept?

---

## Procedural Fluency

Can the learner apply the concept correctly?

---

## Confidence

How confidently did the learner demonstrate understanding?

---

## Independence

How much guidance was required?

---

## Retention Risk

How likely is the learner to forget the concept?

---

## Learning Readiness

Should MentorOS:

- Continue
- Revise
- Practice
- Assess again
- Move to the next topic

---

# Reflection Categories

## Fully Mastered

Ready to progress.

---

## Mostly Mastered

Small reinforcement required.

---

## Partially Mastered

Additional targeted practice recommended.

---

## Needs Revision

Return to concept explanation.

---

## At Risk

Recommend prerequisite revision before continuing.

---

# Learning Summary

The Reflection Agent generates a concise learning summary after each session.

Example:

```
Today's Learning Summary

✔ Equivalent Fractions understood

✔ Visual examples effective

⚠ Simplification requires more practice

Next Recommendation:

Practice 5 simplification questions before continuing.
```

---

# Events Consumed

- AssessmentCompleted
- PracticeCompleted
- ConceptExplained
- SessionEnding

---

# Events Produced

- ReflectionCompleted
- LearningSummaryCreated
- MemoryUpdateRequested
- RevisionRecommended

---

# State Access

## Read

- Learning State
- Assessment State
- Practice State
- Session State

## Write

- Reflection State

The Reflection Agent never updates the Learner Profile directly.

---

# Knowledge Access

Uses:

- Learning Objectives
- Mastery Framework
- Reflection Rules
- Curriculum Progression

---

# Prompt Strategy

The Reflection Agent reasons like a thoughtful teacher reviewing a completed lesson.

Before making recommendations it asks:

- Did the learner truly understand the concept?
- What evidence supports that conclusion?
- What misconceptions remain?
- What should happen next to maximize learning?

The goal is educational insight rather than numerical evaluation.

---

# Decision Logic

```
Receive Assessment Report
        │
        ▼
Collect Learning Evidence
        │
        ▼
Analyze Understanding
        │
        ▼
Estimate Mastery
        │
        ▼
Determine Learning Readiness
        │
        ▼
Generate Reflection Report
        │
        ▼
Publish ReflectionCompleted Event
```

---

# Failure Modes

Possible failures:

- Insufficient learning evidence
- Conflicting assessment signals
- Ambiguous learner behaviour
- Low confidence recommendations

---

# Recovery Strategy

If evidence is insufficient:

- Recommend additional practice.
- Schedule a short reassessment.
- Delay mastery update.

---

# Retry Strategy

Maximum retries: 1

If uncertainty remains:

Recommend another learning cycle before progressing.

---

# Performance Targets

Reflection Latency:

<300 ms

Learning Insight Accuracy:

>90%

Recommendation Precision:

>90%

---

# Observability

Track:

- Reflection latency
- Recommendation distribution
- Reflection confidence
- Revision recommendation frequency
- Learning progression

---

# Evaluation Metrics

Measure:

- Recommendation effectiveness
- Mastery prediction accuracy
- Learner progression
- Revision success rate
- Reflection consistency

---

# Dependencies

Depends on:

- Assessment Agent
- Practice Agent
- Planning Agent
- Learning State

Supports:

- Memory Agent
- Planning Agent
- Evaluation Agent

---

# Success Criteria

The Reflection Agent succeeds when:

- Learning evidence is transformed into meaningful insights.
- Learners progress only when ready.
- Revision is recommended appropriately.
- Long-term learning improves.
- Every session ends with a clear understanding of what was learned and what comes next.

---

# Future Enhancements

Future versions may support:

- Cross-session learning trend analysis
- AI-generated learning reports
- Parent-friendly summaries
- Teacher dashboards
- Predictive learning risk detection
- Goal achievement forecasting