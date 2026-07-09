# Context Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Understanding Layer

---

# Purpose

The Context Agent is responsible for maintaining and enriching the current learning context throughout a learner's session.

Rather than treating every user message independently, the Context Agent ensures every downstream AI agent understands the learner's current situation, previous interactions within the session, and active learning objective.

It acts as the "working memory" of MentorOS.

---

# Problem Statement

Students rarely ask complete questions.

Examples:

> "Why?"

> "Explain that again."

> "Give me another example."

> "I still don't understand."

These messages only make sense when interpreted within the existing conversation.

Without contextual understanding:

- AI repeats explanations
- Learners become frustrated
- Agents lose continuity
- Personalization becomes inconsistent

The Context Agent ensures every interaction builds naturally on the previous one.

---

# Responsibilities

The Context Agent is responsible for:

- Maintaining conversation context
- Summarizing previous interactions
- Tracking the active learning objective
- Identifying the current concept being discussed
- Resolving ambiguous references
- Managing session continuity
- Supplying context to downstream agents

---

# Out of Scope

The Context Agent does NOT:

- Teach concepts
- Retrieve knowledge
- Generate practice
- Assess learners
- Personalize teaching
- Plan learning strategy
- Update long-term learner memory

---

# Inputs

The Context Agent receives:

## User Input

- Voice transcript
- Text message

---

## Session State

- Session ID
- Active lesson
- Current activity
- Session duration

---

## Conversation State

- Previous messages
- Conversation summary
- Active topic
- Pending questions

---

## Learner Profile

(Read-only)

- Grade
- Preferred language
- Current learning goal

---

# Outputs

The Context Agent produces a **Context Object**.

Example:

```json
{
  "active_topic": "Fractions",
  "subtopic": "Equivalent Fractions",
  "conversation_goal": "Concept Explanation",
  "previous_summary": "Student understood numerator but struggles with denominator.",
  "pending_questions": [
    "Explain using pizza example"
  ],
  "confidence": 0.98
}
```

---

# Context Components

The Context Agent maintains several layers of context.

## Conversation Context

- Previous messages
- AI responses
- Clarifications
- Conversation summary

---

## Learning Context

- Current subject
- Current topic
- Current subtopic
- Current lesson objective

---

## Task Context

Current learner activity:

- Learning
- Practicing
- Assessment
- Revision
- Reflection

---

## Interaction Context

Tracks:

- Follow-up questions
- Interruptions
- Topic switches
- Clarifications

---

## Session Context

Tracks:

- Session duration
- Progress
- Active workflow
- Last completed activity

---

# Context Window Strategy

Instead of passing the full conversation to every agent, the Context Agent creates a concise summary containing only information relevant to the current task.

This reduces token usage while preserving continuity.

The Context Agent should continuously update this summary as the conversation evolves.

---

# Topic Tracking

The Context Agent maintains:

Current Subject

↓

Current Chapter

↓

Current Topic

↓

Current Subtopic

↓

Current Learning Objective

Example

```
Mathematics

↓

Fractions

↓

Equivalent Fractions

↓

Comparing Fractions

↓

Understand visual representation
```

---

# Reference Resolution

Learners frequently use references like:

- this
- that
- it
- the previous one

Example:

> "Can you explain that again?"

The Context Agent resolves "that" using conversation history before passing the request downstream.

---

# Events Consumed

- SessionStarted
- QuestionReceived
- ResponseGenerated
- TopicChanged
- AssessmentCompleted
- PracticeCompleted

---

# Events Produced

- ContextUpdated
- TopicChanged
- ConversationSummarized
- ClarificationNeeded

---

# State Access

## Read

- Session State
- Conversation State
- Learning State
- Learner Profile

## Write

- Conversation State
- Session State

The Context Agent never updates the Learner Profile.

---

# Knowledge Access

The Context Agent does not retrieve educational content.

It may access:

- Curriculum hierarchy
- Topic taxonomy
- Conversation history

---

# Prompt Strategy

The Context Agent reasons like an attentive teacher who remembers everything discussed during the current lesson.

Its responsibilities include:

- maintaining continuity
- resolving references
- identifying active learning goals
- summarizing conversation

The agent should never introduce new educational content.

---

# Decision Logic

```
Receive User Message
        │
        ▼
Load Current Session
        │
        ▼
Load Conversation Summary
        │
        ▼
Identify Active Topic
        │
        ▼
Resolve References
        │
        ▼
Update Context
        │
        ▼
Publish ContextUpdated Event
```

---

# Failure Modes

Possible failures:

- Missing conversation history
- Topic drift
- Incorrect reference resolution
- Long conversations exceeding context limits
- Session interruption

---

# Recovery Strategy

If context confidence is low:

- Ask clarifying question.

If conversation exceeds context window:

- Generate a fresh conversation summary.

If topic cannot be determined:

- Request learner clarification.

---

# Retry Strategy

Retry once after rebuilding the conversation summary.

If still unsuccessful:

Fall back to session summary only.

---

# Performance Targets

Context Update Latency:

<100 ms

Reference Resolution Accuracy:

>95%

Conversation Summary Accuracy:

>95%

---

# Observability

Track:

- Context update latency
- Summary generation frequency
- Reference resolution success
- Topic switches
- Context confidence
- Clarification requests

---

# Evaluation Metrics

Measure:

- Context accuracy
- Conversation continuity
- Reference resolution quality
- Downstream task success
- User clarification rate

---

# Dependencies

Depends on:

- Session State
- Conversation State
- Learner Profile
- System State Model

Supports:

- Router Agent
- Personalization Agent
- Planning Agent
- Concept Agent
- Practice Agent
- Assessment Agent

---

# Success Criteria

The Context Agent succeeds when:

- Every downstream agent receives accurate conversational context.
- Learners experience natural multi-turn conversations.
- Topic continuity is preserved.
- References are correctly resolved.
- Long conversations remain coherent without excessive token usage.

---

# Future Enhancements

Future versions may include:

- Multi-session context linking
- Voice emotion context
- Whiteboard/image context
- Collaborative classroom context
- Teacher intervention context
- Context confidence scoring using LLM evaluation