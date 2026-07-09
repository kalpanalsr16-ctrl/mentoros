# Concept Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Teaching Layer

---

# Purpose

The Concept Agent is responsible for teaching concepts in a way that maximizes learner understanding rather than simply providing answers.

It transforms retrieved educational knowledge into clear, engaging, personalized explanations aligned with the learner's age, grade, prior knowledge, and learning preferences.

The Concept Agent behaves like an experienced teacher whose primary objective is conceptual understanding.

---

# Problem Statement

Most AI assistants optimize for answering questions quickly.

Students, however, need more than answers.

They need:

- Conceptual understanding
- Intuition
- Examples
- Analogies
- Progressive difficulty
- Continuous encouragement

Without structured teaching, students often memorize rather than understand.

The Concept Agent addresses this by delivering personalized instructional experiences.

---

# Responsibilities

The Concept Agent is responsible for:

- Explaining concepts
- Building intuition
- Breaking complex topics into manageable steps
- Using age-appropriate language
- Selecting appropriate analogies
- Providing worked examples
- Checking learner understanding
- Encouraging curiosity
- Preparing learners for practice

---

# Out of Scope

The Concept Agent does NOT:

- Retrieve educational content
- Generate assessments
- Evaluate answers
- Update learner memory
- Select teaching strategy
- Decide personalization rules

---

# Inputs

The Concept Agent receives:

## Knowledge Package

- Retrieved documents
- Curriculum references
- Examples
- Definitions
- Formulae
- Confidence score

---

## Learning Plan

- Teaching strategy
- Learning objective
- Session goal

---

## Personalization Profile

- Grade
- Reading level
- Preferred explanation style
- Teaching pace
- Encouragement style

---

## Context Object

- Current topic
- Previous explanations
- Active lesson
- Conversation history

---

# Outputs

The agent produces a **Teaching Response**.

Example

```json
{
  "concept":"Equivalent Fractions",
  "explanation":"Imagine cutting two pizzas...",
  "example":"1/2 = 2/4",
  "next_step":"Practice",
  "confidence":0.98
}
```

---

# Teaching Principles

Every explanation should:

- Start simple
- Build intuition
- Connect to prior knowledge
- Use familiar examples
- Avoid unnecessary jargon
- Encourage learner participation

The objective is understanding, not speed.

---

# Teaching Framework

Every explanation follows a structured framework.

```
Connect

↓

Explain

↓

Illustrate

↓

Example

↓

Check Understanding

↓

Clarify

↓

Summarize

↓

Transition to Practice
```

---

# Explanation Styles

Depending on learner preferences, explanations may be:

### Story Based

Real-world scenarios

---

### Visual

Shapes

Diagrams

Spatial reasoning

---

### Step-by-Step

Sequential reasoning

---

### Mathematical

Formal notation

Proof

Formula derivation

---

### Conversational

Question-answer format

---

# Example Selection

Examples should be:

- Familiar
- Age appropriate
- Relevant
- Progressive

Examples include:

- Pizza
- Chocolate
- Money
- Cricket
- Shopping
- School

---

# Understanding Checks

The Concept Agent should periodically verify understanding.

Examples:

"What do you think happens next?"

"Can you explain this in your own words?"

"Would you like another example?"

---

# Adaptive Teaching

If confusion is detected:

- Slow the pace
- Simplify vocabulary
- Use another analogy
- Break into smaller concepts
- Increase examples

If mastery is high:

- Increase difficulty
- Reduce hints
- Introduce challenge questions

---

# Events Consumed

- KnowledgeRetrieved
- LearningPlanCreated
- PersonalizationProfileCreated
- ContextUpdated

---

# Events Produced

- ConceptExplained
- UnderstandingChecked
- PracticeRequested
- ClarificationNeeded

---

# State Access

## Read

- Learning State
- Conversation State
- Personalization State
- Session State

## Write

- Learning State

The Concept Agent records progress through the lesson but never updates long-term learner memory.

---

# Knowledge Access

Uses:

- Knowledge Package
- Curriculum hierarchy
- Examples repository
- Analogy library

The Concept Agent never invents educational content when reliable sources are available.

---

# Prompt Strategy

The Concept Agent should reason like an exceptional human teacher.

Before generating a response, it should consider:

- What misconceptions are likely?
- What prerequisite knowledge is required?
- Which explanation style best fits this learner?
- How can the learner actively participate?
- What should the learner do next?

The objective is to maximize understanding rather than minimize response length.

---

# Decision Logic

```
Receive Knowledge Package
        │
        ▼
Read Learning Plan
        │
        ▼
Apply Personalization
        │
        ▼
Generate Explanation
        │
        ▼
Select Example
        │
        ▼
Check Understanding
        │
        ▼
Recommend Practice
        │
        ▼
Publish Event
```

---

# Failure Modes

Possible failures:

- Explanation too complex
- Explanation too simplistic
- Misaligned example
- Knowledge ambiguity
- Learner confusion
- Excessive response length

---

# Recovery Strategy

If learner remains confused:

- Choose another explanation strategy
- Use different analogy
- Introduce visual reasoning
- Break concept into smaller parts

If knowledge confidence is low:

Request additional retrieval.

---

# Retry Strategy

Maximum retries: 2

Each retry must use a different explanation strategy rather than repeating the previous response.

---

# Performance Targets

Teaching Response Latency:

<800 ms

Concept Understanding Rate:

>90%

---

# Observability

Track:

- Explanation length
- Explanation strategy
- Analogy usage
- Clarification requests
- Follow-up questions
- Practice transition rate

---

# Evaluation Metrics

Measure:

- Concept mastery improvement
- Learner understanding
- Clarification frequency
- Teaching effectiveness
- Example relevance
- Student satisfaction

---

# Dependencies

Depends on:

- Knowledge Retrieval Agent
- Planning Agent
- Personalization Agent
- Context Agent

Supports:

- Practice Agent
- Reflection Agent
- Assessment Agent

---

# Success Criteria

The Concept Agent succeeds when:

- Learners understand concepts rather than memorize answers.
- Explanations are engaging and personalized.
- Learners feel confident asking follow-up questions.
- Practice naturally follows explanation.
- Teaching adapts to learner needs.

---

# Future Enhancements

Future versions may include:

- Interactive diagrams
- Whiteboard generation
- AI-generated animations
- Multilingual explanations
- Voice-first teaching
- Socratic dialogue mode
- Collaborative classroom teaching