# Personalization Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Learning Strategy Layer

---

# Purpose

The Personalization Agent determines **how MentorOS should teach a specific learner**.

It transforms learner data into a personalized teaching strategy that every educational agent follows.

Rather than allowing each agent to independently interpret learner preferences, the Personalization Agent creates a single source of truth for personalization.

Its objective is to ensure every learning interaction feels tailored to the learner's abilities, preferences, and progress.

---

# Problem Statement

Traditional AI assistants generate largely identical responses for different learners.

However, effective teaching depends on factors such as:

- Age
- Grade
- Prior knowledge
- Learning speed
- Confidence
- Attention span
- Preferred explanation style
- Past mistakes
- Current mastery

Without centralized personalization:

- Explanations become inconsistent.
- Difficulty fluctuates.
- Learning quality decreases.
- Students lose engagement.

The Personalization Agent ensures a consistent teaching experience across the entire platform.

---

# Responsibilities

The Personalization Agent is responsible for:

- Selecting the appropriate explanation style
- Determining teaching pace
- Choosing difficulty level
- Adapting vocabulary
- Recommending examples relevant to the learner
- Suggesting encouragement style
- Defining hint strategy
- Configuring assessment difficulty
- Providing personalization settings to downstream agents

---

# Out of Scope

The Personalization Agent does **not**:

- Explain concepts
- Retrieve educational content
- Generate questions
- Evaluate learner answers
- Update learner memory
- Decide learning strategy (Planning Agent responsibility)

---

# Inputs

The Personalization Agent receives:

## Learner Profile

- Grade
- Age
- Preferred Language
- Preferred Learning Style
- Session History
- Confidence Score
- Mastery Levels
- Weak Concepts
- Strong Concepts

---

## Session State

- Current Session
- Session Duration
- Current Topic
- Learning Goal

---

## Planning Agent Output

- Selected Teaching Strategy
- Recommended Activity
- Learning Objective

---

## Conversation State

- Current Intent
- User Messages
- Clarification Requests

---

# Outputs

The Personalization Agent produces a **Personalization Profile**.

Example

```json
{
  "teaching_style": "Story Based",
  "difficulty": "Beginner",
  "pace": "Slow",
  "examples": "Real Life",
  "encouragement": "High",
  "hint_level": "Progressive"
}
```

This profile is used by the Concept Agent, Practice Agent, and Assessment Agent.

---

# Personalization Dimensions

## Academic

- Grade Level
- Curriculum
- Concept Mastery
- Weak Concepts
- Previous Performance

---

## Learning Preferences

- Visual
- Conversational
- Step-by-Step
- Example First
- Practice First

---

## Behaviour

- Average Session Length
- Practice Frequency
- Hint Usage
- Question Frequency
- Learning Speed

---

## Emotional

Estimated:

- Confidence
- Frustration
- Curiosity
- Motivation
- Engagement

---

# Personalization Strategies

## Young Learner

Characteristics:

- Primary School

Strategy:

- Stories
- Analogies
- Visual descriptions
- Short explanations
- Frequent encouragement

---

## Intermediate Learner

Strategy:

- Step-by-step reasoning
- Multiple worked examples
- Guided practice

---

## Advanced Learner

Strategy:

- Concise explanations
- Challenge questions
- Minimal hints
- Exam-oriented practice

---

## Low Confidence Learner

Strategy:

- Positive reinforcement
- Smaller learning steps
- Easier first questions
- Frequent success moments

---

## High Mastery Learner

Strategy:

- Harder questions
- Less guidance
- Faster pace
- Extension topics

---

# Events Consumed

- LearnerProfileLoaded
- LearningPlanCreated
- SessionStarted
- AssessmentCompleted
- ReflectionCompleted

---

# Events Produced

- PersonalizationProfileCreated
- DifficultyUpdated
- TeachingStyleUpdated

---

# State Access

## Read

- Learner Profile
- Session State
- Learning State

## Write

Personalization State

---

# Knowledge Access

The Personalization Agent does not retrieve educational content.

It accesses:

- Learner Profile
- Curriculum Metadata
- Personalization Rules

---

# Prompt Strategy

The agent reasons like an experienced teacher who knows the learner well.

Before generating recommendations it asks:

- How much does this learner already know?
- What teaching style has worked before?
- How confident is the learner?
- What pace prevents cognitive overload?
- Which explanation style maximizes understanding?

---

# Decision Logic

Input

↓

Read Learner Profile

↓

Determine Learning Style

↓

Determine Difficulty

↓

Determine Teaching Pace

↓

Determine Encouragement Level

↓

Create Personalization Profile

↓

Publish Event

---

# Failure Modes

Possible failures:

- Missing learner profile
- Incorrect confidence estimate
- Contradictory preferences
- Sparse learning history

---

# Recovery Strategy

If insufficient learner information exists:

- Apply age-based defaults
- Ask clarifying questions
- Learn preferences during the session

---

# Retry Strategy

Retry once after refreshing learner profile.

If still unsuccessful:

Fallback to standard teaching profile.

---

# Performance Targets

Latency:

<200 ms

Personalization Accuracy:

>90%

---

# Observability

Track:

- Personalization decisions
- Explanation style used
- Difficulty selected
- Hint level
- Student engagement
- Session completion

---

# Evaluation Metrics

Measure:

- Learner engagement
- Session completion
- Concept mastery improvement
- Student satisfaction
- Personalization accuracy
- Return rate

---

# Dependencies

Depends on:

- Learner Profile
- Planning Agent
- Session State

Supports:

- Concept Agent
- Practice Agent
- Assessment Agent
- Reflection Agent

---

# Success Criteria

The Personalization Agent succeeds when:

- Every learner receives an experience appropriate to their needs.
- Students remain engaged.
- Teaching adapts naturally over time.
- Difficulty matches learner ability.
- MentorOS feels like it understands the learner.

---

# Future Enhancements

Future versions may support:

- Learning personality detection
- AI-generated learner personas
- Adaptive motivation strategies
- Real-time emotional adaptation
- Multi-language personalization
- Accessibility-aware teaching
- Personalized revision schedules