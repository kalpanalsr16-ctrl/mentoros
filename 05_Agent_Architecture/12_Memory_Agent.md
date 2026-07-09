# Memory Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Learning Intelligence Layer

---

# Purpose

The Memory Agent is responsible for maintaining the learner's long-term educational memory.

Unlike the Context Agent, which maintains temporary conversation context, the Memory Agent preserves meaningful learning insights across sessions.

Its objective is to help MentorOS become a better teacher every time a learner returns.

The Memory Agent serves as the learner's persistent educational memory.

---

# Problem Statement

Most AI assistants forget everything after a conversation ends.

This leads to:

- Repeated explanations
- Generic teaching
- No long-term personalization
- No understanding of learner growth

A human tutor remembers previous lessons, strengths, weaknesses, and progress.

MentorOS should provide the same continuity through the Memory Agent.

---

# Responsibilities

The Memory Agent is responsible for:

- Maintaining the Learner Profile
- Updating concept mastery
- Tracking learning history
- Recording misconceptions
- Managing revision schedules
- Updating learning preferences
- Storing meaningful educational insights
- Supporting long-term personalization

---

# Out of Scope

The Memory Agent does NOT:

- Teach concepts
- Generate explanations
- Assess learners
- Retrieve educational content
- Decide learning strategies

---

# Inputs

The Memory Agent receives:

## Reflection Report

- Learning status
- Mastery estimate
- Confidence
- Recommended next steps
- Reflection summary

---

## Assessment Report

- Mastery score
- Misconceptions
- Performance evidence

---

## Session Summary

- Concepts covered
- Practice completed
- Time spent
- Learning activities

---

## Existing Learner Profile

- Previous mastery
- Goals
- Weak concepts
- Learning preferences

---

# Outputs

The Memory Agent produces an updated **Learner Profile**.

Example

```json
{
  "learner_id":"123",
  "concept":"Equivalent Fractions",
  "mastery":86,
  "confidence":"High",
  "weak_concepts":[
      "Fraction Simplification"
  ],
  "revision_due":"2026-07-15",
  "preferred_examples":"Visual",
  "last_updated":"2026-07-09"
}
```

---

# Memory Principles

Only meaningful educational information should be stored.

The Memory Agent should never save raw conversations unless explicitly required.

Memory should answer:

- What has the learner learned?
- What still needs reinforcement?
- How should MentorOS teach this learner next time?

---

# Memory Categories

## Learner Identity

- Learner ID
- Grade
- Preferred language

---

## Academic Progress

- Subjects
- Topics completed
- Current topic
- Curriculum progress

---

## Concept Mastery

For every concept maintain:

- Mastery score
- Confidence
- Last practiced
- Last assessed
- Revision due
- Number of attempts

---

## Misconceptions

Maintain recurring misconceptions.

Example

- Fraction simplification
- Decimal comparison
- Negative numbers

Recurring misconceptions should influence future planning.

---

## Learning Preferences

Track:

- Explanation style
- Practice preference
- Voice/Text preference
- Session duration
- Learning pace

Preferences evolve based on learner behaviour rather than initial setup alone.

---

## Learning Behaviour

Track:

- Average session duration
- Practice completion
- Hint dependency
- Learning streak
- Return frequency

---

## Learning Goals

Maintain:

- Active goals
- Completed goals
- Upcoming goals

---

## Revision Schedule

Maintain:

- Concepts due
- Priority
- Recommended revision date
- Revision frequency

---

# Memory Lifecycle

```
Reflection Completed

↓

Receive Learning Evidence

↓

Validate Evidence

↓

Update Learner Profile

↓

Recalculate Mastery

↓

Schedule Revision

↓

Persist Memory

↓

Publish LearnerProfileUpdated
```

---

# Update Strategy

The Memory Agent should never overwrite information blindly.

Instead:

- Merge new evidence
- Preserve historical trends
- Track improvement over time
- Update only affected concepts

Learning is cumulative.

---

# Forgetting Strategy

Not all information should be stored forever.

Examples of temporary information:

- Current conversation
- Session interruptions
- Temporary clarifications

Examples of long-term memory:

- Mastery
- Preferences
- Misconceptions
- Learning history

---

# Events Consumed

- ReflectionCompleted
- AssessmentCompleted
- SessionEnded
- LearningGoalUpdated

---

# Events Produced

- LearnerProfileUpdated
- RevisionScheduled
- MasteryUpdated
- PersonalizationUpdated

---

# State Access

## Read

- Learner Profile
- Reflection State
- Assessment State
- Learning State

## Write

- Learner Profile State

The Memory Agent is the ONLY agent allowed to update the Learner Profile.

---

# Knowledge Access

Uses:

- Learner Profile Model
- Revision Rules
- Mastery Framework
- Curriculum Progression

---

# Prompt Strategy

The Memory Agent reasons like an experienced tutor maintaining detailed notes about every learner.

Before updating memory it asks:

- What evidence supports this update?
- Is this information useful long-term?
- Does this reflect a temporary event or a persistent learning pattern?
- Will this improve future teaching?

Only durable educational insights should be stored.

---

# Decision Logic

```
Receive Reflection Report
        │
        ▼
Validate Learning Evidence
        │
        ▼
Compare With Existing Memory
        │
        ▼
Update Mastery
        │
        ▼
Update Preferences
        │
        ▼
Schedule Revision
        │
        ▼
Persist Learner Profile
        │
        ▼
Publish LearnerProfileUpdated
```

---

# Failure Modes

Possible failures:

- Conflicting learning evidence
- Duplicate updates
- Incorrect mastery estimates
- Corrupted learner profile
- Incomplete reflection report

---

# Recovery Strategy

If evidence is insufficient:

- Delay profile update.
- Wait for additional assessment.
- Preserve previous mastery estimate.

If conflicts exist:

- Prefer the most recent validated evidence.
- Flag for Evaluation Agent review.

---

# Retry Strategy

Maximum retries: 2

If persistence fails:

Retry update without losing previous learner profile.

---

# Performance Targets

Profile Update Latency:

<250 ms

Memory Consistency:

>99.9%

Revision Scheduling Accuracy:

>95%

---

# Observability

Track:

- Profile updates
- Memory write latency
- Revision schedules
- Preference changes
- Mastery updates
- Duplicate update attempts

---

# Evaluation Metrics

Measure:

- Personalization improvement
- Revision effectiveness
- Mastery prediction accuracy
- Long-term learner retention
- Learning continuity

---

# Dependencies

Depends on:

- Reflection Agent
- Assessment Agent
- Learner Profile Model

Supports:

- Personalization Agent
- Planning Agent
- Context Agent
- Evaluation Agent

---

# Success Criteria

The Memory Agent succeeds when:

- MentorOS remembers meaningful educational insights across sessions.
- Learners never need to repeat their learning history.
- Personalization improves over time.
- Revision recommendations are timely and accurate.
- Long-term learning continuity is preserved.

---

# Future Enhancements

Future versions may support:

- Cross-subject mastery graphs
- Learning trend visualization
- AI-generated learner summaries
- Parent learning reports
- Teacher progress dashboards
- Predictive learning risk detection
- Multi-device synchronized learning history