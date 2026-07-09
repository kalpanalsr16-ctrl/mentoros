# Router Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Understanding Layer

---

# Purpose

The Router Agent is responsible for understanding the learner's request and determining the learner's intent.

It acts as the entry point into the MentorOS learning workflow.

The Router Agent does **not** decide how MentorOS should teach. Instead, it identifies what the learner wants so that downstream agents can make instructional decisions.

---

# Problem Statement

Students ask questions in many different ways.

For example:

> Explain fractions.

> I don't understand fractions.

> Give me practice questions.

> Test me.

> Why is this wrong?

> Can you make it easier?

Although these questions may relate to the same topic, they require different workflows.

The Router Agent classifies learner intent before the platform decides how to respond.

---

# Responsibilities

The Router Agent is responsible for:

- Identifying learner intent
- Extracting the requested topic
- Detecting multiple intents
- Measuring confidence
- Triggering downstream workflow
- Handling ambiguous requests
- Publishing routing events

---

# Out of Scope

The Router Agent does NOT:

- Teach concepts
- Retrieve knowledge
- Generate practice
- Assess learners
- Personalize responses
- Update learner memory
- Create learning plans

---

# Inputs

The Router Agent receives:

## User Input

- Voice transcript
- Text message

---

## Context Agent Output

- Conversation summary
- Previous topic
- Active lesson
- Conversation history

---

## Session State

- Current session
- Active lesson
- Current activity

---

# Outputs

The Router Agent produces an **Intent Object**.

Example

```json
{
  "intent":"ConceptExplanation",
  "confidence":0.97,
  "topic":"Fractions",
  "subtopic":"Equivalent Fractions",
  "priority":"High"
}
```

---

# Supported Intents

Version 1 supports:

## Learning

- Concept Explanation
- Definition
- Example Request
- Why Question
- How Question

---

## Practice

- Generate Practice
- Give More Questions
- Harder Questions
- Easier Questions

---

## Assessment

- Test Me
- Quiz Me
- Check My Answer
- Evaluate My Solution

---

## Revision

- Revise Topic
- Review Previous Lesson
- Practice Weak Concepts

---

## Session

- Resume Learning
- Start New Topic
- Continue Lesson

---

## Platform

- Help
- Feedback
- Settings

---

# Intent Detection Strategy

The Router Agent considers:

- Current conversation
- Previous messages
- Active lesson
- Learning state
- Session context

Intent is determined using contextual understanding rather than keyword matching.

---

# Multiple Intents

Students may ask:

> Explain fractions and then quiz me.

The Router Agent should:

1. Detect both intents.
2. Prioritize the first intent.
3. Pass the secondary intent to the Planning Agent.

---

# Ambiguous Requests

Example:

> I don't get this.

The Router Agent should not guess.

Instead it should request clarification.

Example:

> Are you referring to equivalent fractions or adding fractions?

---

# Events Consumed

- QuestionReceived
- SessionStarted
- ConversationUpdated

---

# Events Produced

- IntentDetected
- TopicDetected
- ClarificationRequired
- RoutingCompleted

---

# State Access

## Read

- Conversation State
- Session State
- Learning State

## Write

Conversation State

The Router Agent never modifies learner profile data.

---

# Knowledge Access

The Router Agent does not retrieve educational content.

It only accesses:

- Curriculum taxonomy
- Topic hierarchy
- Intent taxonomy

---

# Prompt Strategy

The Router Agent reasons as an expert conversation analyst.

Its objective is to understand **what** the learner needs, not **how** to teach it.

When uncertainty exists, it should ask clarifying questions instead of making assumptions.

---

# Decision Logic

```
Receive User Message
        │
        ▼
Read Conversation Context
        │
        ▼
Identify Topic
        │
        ▼
Identify Intent
        │
        ▼
Measure Confidence
        │
        ▼
Single Intent?
      /      \
    Yes      No
     │         │
     ▼         ▼
Publish     Clarify /
Intent      Prioritize
```

---

# Failure Modes

Possible failures:

- Wrong intent classification
- Unknown topic
- Multiple conflicting intents
- Missing context
- Low confidence

---

# Recovery Strategy

If confidence < 80%:

- Ask clarification question.

If topic unknown:

- Request additional information.

If multiple intents detected:

- Prioritize based on learner goal.

---

# Retry Strategy

Retry once after clarification.

If still uncertain:

Route to a generic assistance workflow.

---

# Performance Targets

Intent Detection Latency:

<150 ms

Intent Accuracy:

>95%

Topic Detection Accuracy:

>95%

---

# Observability

Track:

- Intent distribution
- Confidence scores
- Clarification rate
- Misrouting rate
- Average routing latency

---

# Evaluation Metrics

Measure:

- Intent classification accuracy
- Topic extraction accuracy
- Clarification effectiveness
- Downstream workflow success

---

# Dependencies

Depends on:

- Context Agent
- Conversation State
- Curriculum Taxonomy

Supports:

- Personalization Agent
- Planning Agent

---

# Success Criteria

The Router Agent succeeds when:

- Learner intent is correctly identified.
- Appropriate workflow is triggered.
- Ambiguous requests are clarified.
- Downstream agents receive structured routing information.
- Learners rarely experience incorrect workflows.

---

# Future Enhancements

Future versions may support:

- Multi-turn intent refinement
- Emotion-aware routing
- Voice prosody analysis
- Cross-session intent prediction
- Personalized routing optimization
- Curriculum-aware routing