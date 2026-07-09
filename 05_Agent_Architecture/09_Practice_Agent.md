# Practice Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Teaching Layer

---

# Purpose

The Practice Agent is responsible for reinforcing learning through personalized, curriculum-aligned practice.

Its objective is not to generate random questions, but to strengthen conceptual understanding by selecting the right question at the right time.

The Practice Agent acts like a teacher designing practice after understanding what the learner knows and where the learner struggles.

---

# Problem Statement

Learning only happens when learners actively apply concepts.

Simply reading explanations creates an illusion of understanding.

Without structured practice:

- Learners forget concepts quickly.
- Weak areas remain hidden.
- Confidence is overestimated.
- Mastery cannot be measured.

The Practice Agent transforms passive learning into active learning.

---

# Responsibilities

The Practice Agent is responsible for:

- Generating personalized practice questions
- Selecting appropriate difficulty
- Reinforcing weak concepts
- Providing progressive question sequences
- Balancing concept coverage
- Supporting guided practice
- Preparing learners for assessment

---

# Out of Scope

The Practice Agent does NOT:

- Explain concepts
- Evaluate learner answers
- Update learner memory
- Select learning strategy
- Retrieve educational content

---

# Inputs

The Practice Agent receives:

## Learning Plan

- Practice objective
- Difficulty recommendation
- Teaching strategy

---

## Personalization Profile

- Grade
- Learning pace
- Preferred question style
- Hint preference

---

## Learning State

- Current topic
- Current subtopic
- Practice history
- Weak concepts

---

## Knowledge Package

- Examples
- Formulae
- Curriculum mapping
- Common misconceptions

---

## Concept Agent Output

- Explanation completed
- Key concepts covered
- Learner understanding signals

---

# Outputs

The Practice Agent produces a **Practice Set**.

Example

```json
{
  "topic":"Equivalent Fractions",
  "questions":[
      "...",
      "...",
      "..."
  ],
  "difficulty":"Medium",
  "estimated_time":"8 minutes",
  "learning_goal":"Apply equivalent fraction concepts"
}
```

---

# Practice Principles

Every practice session should:

- Reinforce understanding
- Build confidence
- Encourage reasoning
- Progress gradually
- Cover common misconceptions
- Prepare learners for assessment

Practice should never feel like random testing.

---

# Question Types

The Practice Agent supports multiple formats.

### Concept Check

Simple understanding questions.

---

### Worked Example Completion

Fill in missing steps.

---

### Multiple Choice

Concept validation.

---

### Numerical Problems

Direct calculation.

---

### Word Problems

Real-world application.

---

### True / False

Quick misconception checks.

---

### Explain Your Thinking

Learner explains reasoning.

---

### Challenge Question

Higher-order thinking.

---

# Difficulty Levels

Questions are classified into:

- Beginner
- Easy
- Medium
- Advanced
- Challenge

Difficulty is determined by:

- Learner mastery
- Previous performance
- Planning strategy
- Learning objective

---

# Adaptive Practice

The Practice Agent continuously adapts.

If learner performs well:

- Increase complexity
- Reduce hints
- Introduce challenge questions

If learner struggles:

- Simplify questions
- Provide scaffolding
- Increase examples
- Return to prerequisite concepts

---

# Question Sequencing

Questions should follow a progression.

```
Recall

↓

Understand

↓

Apply

↓

Analyze

↓

Challenge
```

The sequence should align with Bloom's Taxonomy where appropriate.

---

# Hint Strategy

Hints should be progressive.

Hint 1

Gentle direction.

↓

Hint 2

Focus attention.

↓

Hint 3

Partial solution.

↓

Hint 4

Worked example.

The full answer should be the last resort.

---

# Misconception Targeting

The Practice Agent should intentionally include questions that reveal common misconceptions.

Examples:

- Sign errors
- Unit conversion mistakes
- Fraction simplification errors
- Order of operations mistakes

These questions help identify conceptual gaps before formal assessment.

---

# Events Consumed

- ConceptExplained
- LearningPlanCreated
- PersonalizationProfileCreated
- KnowledgeRetrieved

---

# Events Produced

- PracticeGenerated
- HintRequested
- PracticeCompleted
- AssessmentRecommended

---

# State Access

## Read

- Learning State
- Session State
- Personalization State
- Knowledge State

## Write

- Learning State (practice progress only)

The Practice Agent never modifies the Learner Profile.

---

# Knowledge Access

Uses:

- Question Bank
- Curriculum Objectives
- Common Misconceptions Repository
- Worked Examples
- Formula Library

---

# Prompt Strategy

The Practice Agent reasons like an experienced teacher designing homework.

Before generating questions it asks:

- What concept needs reinforcement?
- What misconception should this question reveal?
- What is the learner ready for?
- Should the learner be challenged or supported?

The objective is learning through practice, not question generation.

---

# Decision Logic

```
Receive Learning Plan
        │
        ▼
Read Learner Progress
        │
        ▼
Select Learning Objective
        │
        ▼
Determine Difficulty
        │
        ▼
Generate Question Sequence
        │
        ▼
Attach Hint Strategy
        │
        ▼
Publish PracticeGenerated Event
```

---

# Failure Modes

Possible failures:

- Questions too easy
- Questions too difficult
- Repetitive practice
- Curriculum mismatch
- Insufficient concept coverage

---

# Recovery Strategy

If learner repeatedly answers incorrectly:

- Reduce difficulty
- Introduce guided examples
- Return to Concept Agent
- Generate prerequisite practice

---

# Retry Strategy

Maximum retries: 2

Each retry should generate a different question rather than rephrasing the previous one.

---

# Performance Targets

Practice Generation Latency:

<500 ms

Curriculum Alignment:

>98%

Difficulty Accuracy:

>90%

---

# Observability

Track:

- Questions generated
- Difficulty distribution
- Hint usage
- Completion rate
- Time per question
- Practice abandonment
- Question diversity

---

# Evaluation Metrics

Measure:

- Practice completion rate
- Learning gain
- Hint dependency
- Difficulty calibration
- Misconception detection rate
- Transition to assessment

---

# Dependencies

Depends on:

- Planning Agent
- Personalization Agent
- Knowledge Retrieval Agent
- Concept Agent

Supports:

- Assessment Agent
- Reflection Agent
- Memory Agent

---

# Success Criteria

The Practice Agent succeeds when:

- Learners actively apply concepts.
- Practice reinforces understanding.
- Weak areas become visible.
- Confidence improves through guided success.
- Learners are prepared for assessment.

---

# Future Enhancements

Future versions may support:

- Gamified practice
- Adaptive quizzes
- AI-generated diagrams
- Collaborative practice sessions
- Voice-based practice
- Timed exam simulations
- Personalized daily practice plans