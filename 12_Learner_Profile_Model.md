# Learner Profile Model

**Product:** MentorOS

**Version:** 1.0

**Status:** Draft

**Author:** Kalpana Yadav

---

# Purpose

The Learner Profile is the persistent memory of every student using MentorOS.

Unlike chat history, which records conversations, the Learner Profile captures long-term learning information that allows MentorOS to personalize teaching over time.

Every learning session should update this profile.

---

# Why This Exists

Traditional AI assistants forget users after each conversation.

MentorOS should continuously learn about the learner.

The profile enables:

- Personalized explanations
- Adaptive difficulty
- Progress tracking
- Revision planning
- Better recommendations

---

# Profile Structure

## 1. Identity

- Learner ID
- Name
- Age
- Grade
- School (Optional)

---

## 2. Preferences

- Preferred Language
- Voice/Text Preference
- Learning Style
- Explanation Style
- Session Duration Preference

---

## 3. Academic Profile

- Current Subject
- Current Topic
- Completed Topics
- Active Goals

---

## 4. Concept Mastery

For every concept maintain:

- Mastery Score
- Last Practiced
- Confidence
- Number of Attempts
- Common Mistakes

---

Example

```
Fractions

Mastery

82%

Confidence

Medium

Attempts

15

Revision Due

Tomorrow
```

---

## 5. Weak Concepts

Maintain ranked list.

Example

- Fractions
- Algebra
- Geometry

---

## 6. Strong Concepts

Example

- Addition
- Multiplication
- Number Sense

---

## 7. Learning Behaviour

Track:

- Average Session Length
- Questions per Session
- Hint Usage
- Practice Completion
- Preferred Learning Time

---

## 8. Emotional Signals

Estimated values:

- Confidence
- Frustration
- Curiosity
- Engagement

These are inferred from interactions and should never be treated as exact measurements.

---

## 9. Learning History

Maintain:

- Previous Sessions
- Topics Covered
- Assessments
- Practice History

---

## 10. Revision Planner

Maintain:

- Concepts Due
- Suggested Revision Date
- Revision Frequency

Future versions may incorporate spaced repetition algorithms.

---

## 11. Achievement System

Track:

- Learning Streak
- Concepts Mastered
- Practice Completed
- Milestones

Achievements should encourage learning rather than competition.

---

# Who Can Read This Profile?

| Agent | Permission |
|---------|------------|
| Router Agent | Read |
| Context Agent | Read |
| Concept Agent | Read |
| Practice Agent | Read |
| Assessment Agent | Read |
| Memory Agent | Read + Write |
| Evaluation Agent | Read |
| Observability Agent | Metadata Only |

The Memory Agent is the only component responsible for updating the learner profile.

---

# Update Rules

After every session, MentorOS should update:

- Mastery scores
- Weak concepts
- Strong concepts
- Learning history
- Revision schedule
- Confidence estimates
- Session statistics

Updates should be incremental and based on evidence from learner interactions.

---

# Privacy Principles

Learner data should be:

- Securely stored
- Used only for personalization
- Transparent to the learner
- Exportable
- Deletable upon request

MentorOS should collect only the information necessary to improve learning.

---

# Future Extensions

Potential additions include:

- Parent preferences
- Accessibility settings
- Multi-language proficiency
- Career interests
- Learning goals
- AI-generated learner summaries

---

# Success Criteria

A successful Learner Profile enables MentorOS to:

- Remember the learner across sessions.
- Personalize explanations without repeated setup.
- Recommend timely revision.
- Adapt teaching strategies based on evidence.
- Continuously improve the learner's experience over time.