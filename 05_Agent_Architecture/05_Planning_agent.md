# Planning Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Learning Strategy Layer

---

# Purpose

The Planning Agent is responsible for deciding the optimal learning strategy for every learner interaction.

Unlike a chatbot that immediately answers questions, MentorOS first determines the best instructional approach before generating a response.

The Planning Agent acts like an experienced teacher who first understands the learner's situation before deciding how to teach.

It orchestrates the learning experience rather than generating educational content itself.

---

# Problem Statement

Students rarely benefit from receiving the same response for every question.

Two students asking the exact same question may require completely different teaching approaches based on:

- Grade level
- Prior knowledge
- Current mastery
- Confidence
- Learning history
- Learning objective
- Previous mistakes

Without planning, AI tutoring becomes reactive rather than adaptive.

The Planning Agent solves this problem by selecting an instructional strategy before teaching begins.

---

# Responsibilities

The Planning Agent is responsible for:

- Determining the learner's immediate goal
- Selecting the most appropriate teaching strategy
- Choosing the sequence of learning activities
- Recommending when to explain, practice, assess, or revise
- Coordinating the next agent in the workflow
- Deciding when to stop or continue a learning session
- Preventing learners from skipping foundational concepts

---

# Out of Scope

The Planning Agent does **not**:

- Explain concepts
- Retrieve knowledge
- Generate questions
- Evaluate answers
- Update learner memory
- Produce voice responses

These responsibilities belong to other agents.

---

# Inputs

The Planning Agent receives:

## Session State

Current learning session

Current lesson

Session duration

---

## Conversation State

Latest learner query

Conversation history

Current intent

Pending questions

---

## Learner Profile

Grade

Learning preferences

Mastery levels

Weak concepts

Strong concepts

Confidence

Learning goals

---

## Learning State

Current concept

Progress

Assessment status

Practice history

Revision schedule

---

## Router Output

Detected intent

Intent confidence

Topic

Complexity

---

# Outputs

The Planning Agent produces a **Learning Plan**.

Example

```json
{
  "strategy": "Explain → Example → Guided Practice → Assessment",
  "difficulty": "Intermediate",
  "pace": "Slow",
  "next_agent": "Concept Agent",
  "follow_up_required": true
}
```

The Learning Plan becomes the execution blueprint for the current interaction.

---

# Teaching Strategies

The Planning Agent can select from predefined instructional strategies.

## Strategy 1 — Concept First

Use when:

- New topic
- Low mastery
- Beginner learner

Flow:

Concept

↓

Example

↓

Practice

↓

Assessment

---

## Strategy 2 — Guided Discovery

Use when:

- Student shows prior knowledge
- Confidence is moderate

Flow:

Question

↓

Hint

↓

Learner Attempt

↓

Explanation

↓

Practice

---

## Strategy 3 — Practice First

Use when:

- Revision session
- High mastery
- Exam preparation

Flow:

Practice

↓

Assessment

↓

Targeted Explanation

---

## Strategy 4 — Revision

Use when:

- Revision due
- Weak concepts detected

Flow:

Recall

↓

Practice

↓

Assessment

↓

Memory Update

---

## Strategy 5 — Diagnostic

Use when:

- Unknown learner
- New topic
- Low confidence in learner profile

Flow:

Diagnostic Questions

↓

Determine Level

↓

Select Strategy

---

# Decision Logic

The Planning Agent evaluates:

1. What is the learner trying to achieve?

2. Does the learner already know this topic?

3. Should MentorOS explain or ask first?

4. Is practice more valuable than explanation?

5. Should revision occur before introducing new material?

6. Has the learner forgotten prerequisite concepts?

7. Should the learner be assessed?

---

# Events Consumed

- IntentDetected
- LearnerProfileLoaded
- SessionStarted
- AssessmentCompleted
- ConceptExplained
- PracticeCompleted
- RevisionRecommended

---

# Events Produced

- LearningPlanCreated
- RevisionRequested
- AssessmentRequested
- PracticeRequested
- TeachingStrategySelected

---

# State Access

## Read

- Session State
- Conversation State
- Learning State
- Learner Profile
- Assessment Results

## Write

Planning State only

The Planning Agent never modifies learner memory directly.

---

# Knowledge Access

The Planning Agent does not retrieve educational content.

Instead it accesses:

- Curriculum hierarchy
- Learning objectives
- Topic dependencies
- Prerequisite graph

---

# Prompt Strategy

The Planning Agent should reason like an experienced educator.

Before making a decision it should ask:

- What is the learner trying to accomplish?
- What evidence supports this?
- Which teaching strategy maximizes understanding?
- Which prerequisite concepts are required?
- How can we minimize cognitive overload?

It should optimize for learning outcomes rather than minimizing conversation length.

---

# Decision Tree

Student asks question

↓

Is this a new concept?

↓

Yes

↓

Explain

↓

Example

↓

Practice

↓

Assessment

↓

Memory Update

---

No

↓

Mastery High?

↓

Yes

↓

Practice

↓

Assessment

↓

Next Topic

---

No

↓

Hint

↓

Guided Learning

↓

Practice

↓

Assessment

---

# Failure Modes

Possible failures:

- Wrong learning strategy selected
- Missing learner context
- Incorrect mastery estimate
- Invalid prerequisite chain
- Conflicting recommendations

---

# Recovery Strategy

If confidence is low:

- Select Diagnostic Strategy

If learner profile is incomplete:

- Ask diagnostic questions

If topic dependency unknown:

- Retrieve curriculum graph

---

# Retry Strategy

Maximum retries: 2

If planning repeatedly fails:

Escalate to a simplified teaching strategy.

---

# Performance Targets

Planning latency:

<300 ms

Decision confidence:

>90%

Planning success rate:

>95%

---

# Observability

Track:

- Strategy selected
- Planning latency
- Strategy success rate
- Strategy abandonment
- Learner completion
- Concept mastery improvement

---

# Evaluation Metrics

Evaluate using:

- Learning gain
- Practice completion
- Assessment improvement
- Session completion
- Student satisfaction
- Personalization accuracy
- Revision effectiveness

---

# Dependencies

Depends on:

- Router Agent
- Learner Profile
- Curriculum Graph
- Learning State
- Session State

Supports:

- Concept Agent
- Practice Agent
- Assessment Agent
- Memory Agent

---

# Success Criteria

The Planning Agent succeeds when:

- Learners receive the right teaching strategy.
- Students remain engaged.
- Concept mastery improves.
- Practice is introduced at the right time.
- Revision is recommended appropriately.
- Learning becomes adaptive rather than reactive.

---

# Future Enhancements

Future versions may include:

- Reinforcement Learning for teaching strategy optimization
- A/B testing of instructional plans
- Multi-session learning plans
- Personalized study schedules
- Goal-based tutoring
- AI-generated lesson planning
- Curriculum-aware planning across multiple subjects