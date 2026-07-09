# System State Model

**Product:** MentorOS

**Version:** 1.0

**Status:** Draft

**Author:** Kalpana Yadav

---

# Purpose

This document defines every state maintained by MentorOS while a learner interacts with the platform.

Unlike traditional software applications where state mostly represents UI data, MentorOS maintains educational, conversational, cognitive, and AI system states simultaneously.

The System State Model acts as the central source of truth that enables multiple AI agents to collaborate consistently.

Every agent reads from the system state.

Only authorized agents are allowed to update specific parts of the state.

---

# Why State Matters

MentorOS is not a chatbot.

It is a multi-agent AI platform.

Every learner interaction creates new information.

Without a shared state:

• agents repeat work

• conversations lose context

• personalization becomes impossible

• evaluation cannot be performed

• observability becomes fragmented

The System State ensures every agent has consistent context before making decisions.

---

# High Level State Architecture

```

User

↓

Session State

↓

Conversation State

↓

Learning State

↓

Learner Profile

↓

Agent State

↓

Knowledge State

↓

Evaluation State

↓

Observability State

```

Each state is independently maintained while contributing to a unified learner experience.

---

# Principles

System State should be:

• Accurate

• Explainable

• Observable

• Recoverable

• Versioned

• Secure

• Extensible

---

# State Categories

MentorOS maintains eight independent state domains.

1. Session State

2. Conversation State

3. Learning State

4. Learner Profile State

5. Agent State

6. Knowledge State

7. Evaluation State

8. Observability State

---

# 1. Session State

Represents the active learning session.

## Stores

Session ID

Start Time

Current User

Authentication Status

Current Device

Current Language

Current Mode

Voice Enabled

Current Topic

Current Lesson

Session Duration

Last Activity

Session Status

---

## Updated By

Context Agent

Memory Agent

---

## Read By

All agents

---

# 2. Conversation State

Tracks everything happening inside the current conversation.

## Stores

Conversation ID

Previous Messages

Conversation Summary

Current Intent

Conversation Goal

Conversation Depth

Pending Questions

Active Follow-ups

Current Response

Conversation Confidence

---

## Updated By

Router Agent

Context Agent

---

## Read By

Concept Agent

Practice Agent

Assessment Agent

---

# 3. Learning State

Represents where the learner currently is in the educational journey.

## Stores

Current Subject

Current Concept

Current Subtopic

Learning Goal

Mastery Level

Difficulty Level

Current Activity

Practice Status

Assessment Status

Revision Status

Learning Progress

---

Example

```

Subject

Mathematics

Concept

Fractions

Activity

Concept Explanation

Progress

45%

```

---

# 4. Learner Profile State

Long-term personalized memory.

Reference

12_Learner_Profile_Model.md

Stores

• Preferences

• Weak Concepts

• Strong Concepts

• Learning History

• Goals

• Confidence

Only the Memory Agent can modify this state.

---

# 5. Agent State

Tracks the status of every AI agent.

For each agent maintain

Agent Name

Current Status

Running

Waiting

Completed

Failed

Latency

Retries

Last Invocation

Error Status

Confidence

---

Example

Router Agent

Status

Completed

Latency

312 ms

Confidence

98%

---

# 6. Knowledge State

Tracks retrieved educational information.

Stores

Knowledge Source

Retrieved Documents

Chunks

Embeddings

Retrieval Score

Citation Information

Confidence Score

Cache Status

---

Purpose

Ensures every educational response can be traced back to verified knowledge.

---

# 7. Evaluation State

Maintains quality measurements.

Stores

Groundedness

Hallucination Score

Correctness

Teaching Quality

Retrieval Quality

Latency

Token Usage

Prompt Version

Evaluation Result

---

Updated by

Evaluation Agent

---

# 8. Observability State

Stores production monitoring information.

Tracks

Trace ID

Conversation Timeline

Agent Timeline

Latency

Errors

Failures

Retries

Tool Calls

Cost

Memory Updates

---

This state powers the internal observability dashboard.

---

# State Lifecycle

Every learner interaction follows this lifecycle.

User Input

↓

Session State Updated

↓

Conversation State Updated

↓

Router Agent

↓

Knowledge Retrieval

↓

Concept Agent

↓

Practice Agent

↓

Assessment

↓

Memory Update

↓

Evaluation

↓

Observability Logging

↓

Response

---

# State Ownership

| State | Owner |
|---------|----------------|
| Session | Context Agent |
| Conversation | Router Agent |
| Learning | Concept Agent |
| Learner Profile | Memory Agent |
| Knowledge | Retrieval Agent |
| Evaluation | Evaluation Agent |
| Observability | Observability Agent |

Ownership defines which component is allowed to modify each state.

Other agents may read the state but should not update it directly.

---

# State Synchronization

Whenever one state changes, dependent states should update consistently.

Example

Learner answers correctly

↓

Learning State

Mastery increases

↓

Learner Profile

Weak concept removed

↓

Evaluation State

Teaching effectiveness updated

↓

Observability

Trace recorded

---

# State Recovery

If a session is interrupted,

MentorOS should recover:

• Conversation

• Current Concept

• Practice Progress

• Learner Profile

• Revision Plan

The learner should feel as if the conversation never ended.

---

# Future Extensions

Future versions may include:

• Emotional State Engine

• Multi-device synchronization

• Classroom state

• Parent state

• Teacher state

• Collaborative learning state

• Real-time tutoring state

---

# Success Criteria

A successful System State Model enables MentorOS to:

• Maintain long-term learner memory

• Coordinate multiple AI agents

• Personalize every interaction

• Support observability

• Recover interrupted sessions

• Improve evaluation quality

• Scale to future learning experiences

The System State is the shared intelligence layer that allows MentorOS to behave as a cohesive learning platform rather than a collection of independent AI agents.