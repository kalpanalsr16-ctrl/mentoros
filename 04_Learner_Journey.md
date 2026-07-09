# Learning Journey

**Product:** MentorOS

**Version:** 1.0

**Status:** Draft

**Author:** Kalpana Yadav

---

# Purpose

This document defines how a learner experiences MentorOS from the moment they begin learning until they achieve mastery.

Unlike traditional user journey documents that focus only on screens and clicks, this document captures the learner's cognitive, emotional, and educational journey. It serves as the blueprint for agent orchestration, personalization, and memory management.

Every interaction should move the learner one step closer to conceptual understanding.

---

# Journey Principles

The learning journey should always be:

- Personalized
- Conversational
- Adaptive
- Encouraging
- Measurable
- Continuous

Learning should feel like interacting with a patient mentor rather than using a search engine.

---

# High-Level Learning Journey

```
Student

↓

Launch MentorOS

↓

Authentication

↓

Load Learner Profile

↓

Resume Previous Session (if available)

↓

Choose Learning Goal

↓

Voice/Text Conversation

↓

Intent Detection

↓

Knowledge Retrieval

↓

Concept Explanation

↓

Guided Learning

↓

Practice Questions

↓

Assessment

↓

Memory Update

↓

Progress Dashboard

↓

Revision Recommendation

↓

End Session
```

---

# Journey 1 — First-Time User

## Objective

Help the learner feel comfortable and establish a baseline understanding.

### Step 1

Student signs in.

MentorOS welcomes the learner warmly.

---

### Step 2

Collect initial profile:

- Grade
- Subject
- Preferred language
- Preferred interaction (Voice/Text)
- Learning goals

---

### Step 3

Initialize learner profile.

---

### Step 4

Recommend first topic.

---

### Step Step 5

Begin guided conversation.

---

### Success Criteria

Student successfully completes their first concept.

---

# Journey 2 — Returning Learner

Instead of asking:

"What would you like to learn?"

MentorOS should remember.

Example:

> Yesterday we were learning fractions.
Would you like to continue?

---

The learner should immediately feel that MentorOS remembers them.

---

# Journey 3 — Learning a New Concept

Student selects:

"Fractions"

↓

Router Agent

↓

Knowledge Retrieval

↓

Concept Agent

↓

Example

↓

Visualization

↓

Practice

↓

Assessment

↓

Memory Update

↓

Mastery Score Update

---

# Journey 4 — Asking a Doubt

Example:

"Why do we cross multiply?"

The system should:

- Understand intent
- Retrieve trusted content
- Explain concept
- Give another example
- Ask if learner understood
- Offer practice

---

# Journey 5 — Practice Session

Student requests practice.

↓

Practice Agent

↓

Generate questions

↓

Student answers

↓

Assessment Agent

↓

Identify mistakes

↓

Provide feedback

↓

Update mastery

---

# Journey 6 — Revision Session

Before teaching something new,

MentorOS should identify:

- Weak concepts
- Revision due
- Forgotten topics

The platform should recommend revision before introducing advanced concepts.

---

# Journey 7 — Parent Review (Future)

Parent opens dashboard.

Sees:

- Learning streak
- Mastered concepts
- Weak concepts
- Practice completed
- Confidence trend

---

# Emotional Journey

MentorOS should recognize emotional states.

Possible learner emotions:

- Curious
- Confused
- Frustrated
- Bored
- Confident
- Excited

Teaching strategy should adapt accordingly.

Example:

Confused learner

↓

Simpler explanation

↓

Another example

↓

Encouragement

↓

Practice

---

# Agent Responsibilities During Journey

| Stage | Primary Agent |
|---------|--------------|
| Onboarding | Context Agent |
| Intent Detection | Router Agent |
| Knowledge Retrieval | Retrieval Agent |
| Teaching | Concept Agent |
| Practice | Practice Agent |
| Assessment | Assessment Agent |
| Personalization | Memory Agent |
| Evaluation | Evaluation Agent |
| Monitoring | Observability Agent |

---

# Personalization Opportunities

Throughout the journey MentorOS should personalize:

- Examples
- Difficulty
- Pace
- Language
- Voice
- Question type
- Revision frequency
- Encouragement

---

# Journey Success Metrics

A successful learning journey should improve:

- Concept mastery
- Session completion
- Practice completion
- Confidence
- Retention
- Return rate
- Learning streak

---

# Failure Scenarios

The system should gracefully handle:

- Low confidence
- Wrong answers
- Voice recognition failures
- Missing knowledge
- Low retrieval confidence
- User interruptions
- Session abandonment

---

# Future Journeys

Future versions will support:

- Homework mode
- Exam preparation
- Classroom mode
- Teacher-led sessions
- Collaborative learning
- Image-based problem solving