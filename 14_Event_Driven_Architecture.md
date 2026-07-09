# Event Driven Architecture

**Product:** MentorOS

**Version:** 1.0

**Status:** Draft

**Author:** Kalpana Yadav

---

# Purpose

This document defines how different components within MentorOS communicate.

Instead of directly invoking one another, AI agents communicate through events.

An event represents something meaningful that has occurred within the learning platform.

Examples include:

- Student asked a question
- Knowledge retrieved
- Practice completed
- Assessment finished
- Learner profile updated

This approach improves scalability, modularity, observability, and maintainability.

---

# Why Event Driven?

Traditional AI applications rely on direct function calls.

Example:

```

Router

↓

Concept Agent

↓

Practice Agent

↓

Assessment Agent

```

As more agents are introduced, this architecture becomes difficult to maintain.

Every new feature requires modifying existing agents.

MentorOS instead follows an event-driven architecture.

```

Router Agent

↓

IntentDetected Event

↓

Interested Agents react independently

```

Agents become independent producers and consumers of events.

---

# Event Lifecycle

Every interaction inside MentorOS generates events.

```

Student Speaks

↓

QuestionReceived

↓

IntentDetected

↓

KnowledgeRetrieved

↓

ConceptExplained

↓

PracticeGenerated

↓

AssessmentCompleted

↓

MemoryUpdated

↓

EvaluationCompleted

↓

ObservabilityRecorded

```

The platform becomes a sequence of meaningful educational events.

---

# Event Principles

Every event should be:

- Immutable
- Timestamped
- Traceable
- Observable
- Replayable
- Versioned

Events should describe facts.

They should never contain business logic.

---

# Event Structure

Every event contains:

```

Event ID

Event Name

Timestamp

Learner ID

Session ID

Conversation ID

Triggering Agent

Payload

Metadata

Correlation ID

```

Example:

```

Event Name

IntentDetected

Payload

Intent

Concept Explanation

Confidence

98%

Topic

Fractions

```

---

# Event Categories

MentorOS currently defines six event categories.

---

## 1. Session Events

Examples

- SessionStarted
- SessionResumed
- SessionPaused
- SessionEnded

---

## 2. Conversation Events

Examples

- QuestionReceived
- IntentDetected
- ResponseGenerated
- FollowUpRequested

---

## 3. Learning Events

Examples

- TopicSelected
- ConceptExplained
- PracticeGenerated
- PracticeCompleted
- HintRequested
- RevisionRecommended

---

## 4. Assessment Events

Examples

- AssessmentStarted
- AssessmentCompleted
- IncorrectAnswerDetected
- MasteryUpdated

---

## 5. Memory Events

Examples

- LearnerProfileLoaded
- LearnerProfileUpdated
- WeakConceptDetected
- LearningGoalChanged

---

## 6. Platform Events

Examples

- EvaluationCompleted
- TraceRecorded
- ErrorDetected
- RetryTriggered
- AgentFailed
- CostUpdated

---

# Event Flow Example

Student asks:

"Why does cross multiplication work?"

↓

QuestionReceived

↓

Router Agent

↓

IntentDetected

↓

Knowledge Retrieval Agent

↓

KnowledgeRetrieved

↓

Concept Agent

↓

ConceptExplained

↓

PracticeGenerated

↓

Student Solves

↓

AssessmentCompleted

↓

LearnerProfileUpdated

↓

EvaluationCompleted

↓

TraceRecorded

---

# Event Producers

| Agent | Produces |
|---------|----------|
| Voice Agent | SpeechCaptured |
| Router Agent | IntentDetected |
| Retrieval Agent | KnowledgeRetrieved |
| Concept Agent | ConceptExplained |
| Practice Agent | PracticeGenerated |
| Assessment Agent | AssessmentCompleted |
| Memory Agent | LearnerProfileUpdated |
| Evaluation Agent | EvaluationCompleted |
| Observability Agent | TraceRecorded |

---

# Event Consumers

Events may trigger multiple agents.

Example

```

ConceptExplained

↓

Practice Agent

↓

Memory Agent

↓

Evaluation Agent

↓

Observability Agent

```

No agent needs to know who else is listening.

---

# Event Replay

Every event should be stored.

Replay allows developers to:

- Debug conversations
- Reproduce failures
- Evaluate prompts
- Improve orchestration

Replay is essential for production AI systems.

---

# Event Ordering

Events must occur in chronological order.

Each event references:

- Previous Event
- Parent Event
- Root Conversation

This creates a complete execution graph.

---

# Event Reliability

The platform should guarantee:

- No duplicated events
- Retry failed events
- Preserve ordering
- Detect missing events

---

# Future Event Types

Future versions may include:

- ImageUploaded
- HomeworkAssigned
- ParentViewedProgress
- TeacherFeedbackReceived
- RevisionReminderSent
- AchievementUnlocked

---

# Success Criteria

A successful event-driven architecture allows MentorOS to:

- Scale without tightly coupling agents
- Introduce new agents without changing existing ones
- Replay complete learning sessions
- Power observability dashboards
- Support evaluations
- Simplify debugging
- Enable future automation

Events become the communication language of MentorOS.