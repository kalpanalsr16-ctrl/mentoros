# Safety Agent

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

**Layer:** Understanding Layer

---

# Purpose

The Safety Agent protects learners, the platform, and educational integrity by ensuring every interaction complies with MentorOS safety principles before entering the teaching workflow.

Unlike traditional AI safety systems that primarily detect harmful content, the MentorOS Safety Agent evaluates educational, behavioral, technical, and platform safety.

It acts as the trust layer of MentorOS.

---

# Problem Statement

AI tutors interact directly with children and students.

This creates responsibilities beyond traditional chatbots.

Potential risks include:

- Hallucinated educational content
- Unsafe advice
- Prompt injection
- Exam cheating
- Age-inappropriate explanations
- Offensive language
- Data leakage
- Curriculum violations

The Safety Agent prevents these issues before they propagate through the learning workflow.

---

# Responsibilities

The Safety Agent is responsible for:

- Prompt injection detection
- Jailbreak detection
- Educational integrity checks
- Age appropriateness validation
- Harmful content detection
- Academic honesty enforcement
- Privacy protection
- AI confidence validation
- Escalation decisions

---

# Out of Scope

The Safety Agent does NOT:

- Teach concepts
- Retrieve knowledge
- Personalize explanations
- Generate practice
- Update learner memory
- Assess learning

---

> **Revision note (2026-07-12):** Safety Agent executes **before** Router Agent, not after — confirmed by the product owner when this created a documentation inconsistency (this section previously listed "Router Output" as an input, which is impossible if Safety runs first; the Dependencies section below has been corrected to match). Only messages that pass Safety reach Router, Planning, Knowledge Retrieval, and Concept Agent. See `11_Policy_Engine.md`'s Pipeline Position section for the full ordering rationale.

# Inputs

The Safety Agent receives:

## User Message

Voice transcript

Text input

---

## Context Object

Conversation history

Current topic

Active lesson

Session information

---

## Learner Profile

Age

Grade

Language

Learning goal

---

# Outputs

The Safety Agent produces a Safety Assessment.

Example

```json
{
  "safe": true,
  "risk_level": "Low",
  "confidence": 0.99,
  "policy": "PromptInjection",
  "action": "Allow"
}
```

`action` is `"Allow"` or `"Block"` for M9 (see the Revision note after Risk Levels, below) -- `risk_level` remains four-valued for observability/telemetry, it just no longer drives a third or fourth enforcement action on its own.

---

# Safety Categories

The Safety Agent evaluates multiple categories.

---

## Educational Safety

Checks for:

- Incorrect mathematical reasoning
- Unsupported explanations
- Hallucinated concepts
- Curriculum mismatch
- Misleading examples

---

## Child Safety

Ensures:

- Age appropriate language
- Positive interactions
- No harmful guidance
- Respectful communication

---

## Prompt Injection

Detect attempts such as:

"Ignore previous instructions."

"Pretend you're not MentorOS."

"Reveal your system prompt."

"Disable safety."

---

## Academic Integrity

Prevent:

- Homework completion without learning
- Exam cheating
- Answer dumping
- Circumventing assessments

Instead encourage:

- Hints
- Guided reasoning
- Concept understanding

---

## Privacy

Prevent exposure of:

- Personal learner data
- Internal prompts
- Hidden system information

---

## Platform Safety

Detect:

- Malicious requests
- Abuse
- Spam
- Automated attacks

---

# Risk Levels

## Low

Proceed normally.

---

## Medium

Respond with additional safeguards.

Example:

Provide hints instead of full answers.

---

## High

Request clarification.

Limit functionality.

---

## Critical

Terminate workflow.

Escalate to safe response.

---

> **Revision note (2026-07-12):** For M9, the four risk levels above still classify severity (used for logging/telemetry), but the *enforced action* collapses to two outcomes: **Allow** (Low) or **Block** (Medium, High, and Critical all block). The "Respond with additional safeguards" / "provide hints instead of full answers" behavior described under Medium is real long-term architecture but is deferred, not implemented in M9 -- it requires a routing/prompt-transformation pipeline (a way to hand Concept/Practice Agent a *constrained* version of the request) that doesn't exist yet. Implementing partial plumbing for it now would be guessed-at infrastructure. See `11_Policy_Engine.md`'s Enforcement Actions section for the full mapping and rationale.

# Events Consumed

- QuestionReceived
- IntentDetected
- ContextUpdated

---

# Events Produced

- SafetyApproved
- SafetyWarning
- SafetyRejected
- EscalationRequired

---

# State Access

## Read

Session State

Conversation State

Learner Profile

Learning State

---

## Write

Safety State only

---

# Knowledge Access

Policy Rules

Age Guidelines

Academic Integrity Rules

Platform Security Rules

---

# Prompt Strategy

The Safety Agent reasons conservatively.

When uncertainty exists:

Prefer protecting the learner over maximizing convenience.

It should explain restrictions politely while preserving a positive learning experience.

---

# Decision Logic

Receive Request

↓

Evaluate Educational Safety

↓

Evaluate Child Safety

↓

Evaluate Prompt Injection

↓

Evaluate Academic Integrity

↓

Determine Risk Level

↓

Approve or Block

↓

Publish Event

---

# Failure Modes

Possible failures:

False positive

False negative

Unknown request

Ambiguous intent

Policy conflict

---

# Recovery Strategy

If confidence is low:

Request clarification.

If risk remains unclear:

Use safest acceptable response.

---

# Retry Strategy

Retry once after additional context.

If still uncertain:

Escalate to restricted workflow.

---

# Performance Targets

Latency

<100 ms

Safety Detection Accuracy

>99%

Prompt Injection Detection

>99%

---

# Observability

Track:

Blocked requests

Safety warnings

Policy violations

Injection attempts

Academic integrity violations

False positives

---

# Evaluation Metrics

Measure:

Safety accuracy

False positive rate

False negative rate

Policy compliance

User satisfaction

---

# Dependencies

Depends on:

Context Agent

Policy Engine

Supports:

Router Agent

Planning Agent

Concept Agent

Practice Agent

Assessment Agent

Safety Agent is the first agent to touch an incoming message -- it does not depend on Router Agent's classification, and Router Agent does not run at all until Safety has approved the message. See the Revision note under Inputs above.

---

# Success Criteria

The Safety Agent succeeds when:

Unsafe interactions are prevented.

Legitimate learners experience minimal friction.

Educational integrity is preserved.

Children receive age-appropriate responses.

Trust in MentorOS remains high.

---

# Future Enhancements

Future versions may support:

Dynamic policy updates

Regional curriculum policies

Guardian controls

Teacher override workflows

Adaptive safety thresholds

AI-generated safety explanations