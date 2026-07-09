# Agent Template

**Product:** MentorOS

**Architecture Version:** 1.0

**Document Version:** 1.0

**Status:** Draft

**Owner:** AI Platform Team

---

# Purpose

This document defines the standard specification template that every MentorOS AI agent must follow.

All agents should implement a single responsibility while collaborating through shared state and events.

Maintaining a common structure across every agent ensures consistency, easier maintenance, better observability, and predictable implementation.

---

# Agent Information

| Field | Value |
|---------|--------|
| Agent Name | |
| Layer | |
| Version | |
| Owner | |
| Status | |
| Dependencies | |

---

# Purpose

Why does this agent exist?

What business problem does it solve?

Why can't another agent perform this responsibility?

---

# Responsibilities

Primary responsibilities.

Secondary responsibilities.

Explicitly out of scope.

Every responsibility should be measurable.

---

# Inputs

List every input accepted by the agent.

Examples:

- User Question
- Retrieved Knowledge
- Session State
- Learning State
- Learner Profile
- Events
- Previous Conversation

For every input describe:

- Source
- Required
- Optional
- Validation Rules

---

# Outputs

Describe every output produced.

Examples:

- Explanation
- Intent
- Recommendation
- Event
- Memory Update
- Evaluation Score

Every output should define:

- Format
- Consumer
- Validation

---

# Events Consumed

Document every event this agent listens for.

| Event | Source | Purpose |
|---------|---------|----------|
| | | |

---

# Events Produced

Document every event published.

| Event | Trigger | Consumers |
|---------|----------|-------------|
| | | |

---

# State Access

Define which system states this agent can access.

## Read

- Session State
- Conversation State

etc.

## Write

List writable states.

## Restricted

List states that must never be modified.

---

# Knowledge Access

Which knowledge sources may be accessed?

Examples:

- Textbooks
- Formula Library
- FAQ
- Worked Examples
- Previous Sessions

---

# Tools

List external tools available.

Example

- Vector Database
- Search API
- Calculator
- OCR
- Speech Recognition
- Text-to-Speech

---

# Prompt Strategy

Describe how the agent reasons.

This section should explain:

- reasoning strategy
- response style
- tone
- teaching philosophy
- limitations

without exposing implementation prompts.

---

# Decision Logic

Explain how the agent decides what action to take.

Include decision tree or flowchart where appropriate.

---

# Failure Modes

Possible failures.

Examples

- Low confidence

- Missing knowledge

- Invalid input

- Tool failure

- Timeout

- Safety violation

For every failure describe recovery strategy.

---

# Retry Strategy

When should this agent retry?

Maximum retry count.

Escalation logic.

Fallback behaviour.

---

# Security

Define:

- data access

- authentication

- authorization

- privacy

- prompt injection protection

---

# Performance Targets

Target latency

Target availability

Expected throughput

Maximum context size

Token budget

---

# Observability

Metrics to capture.

Examples

- Latency

- Success Rate

- Error Rate

- Retry Count

- Token Usage

- Cost

- Tool Calls

- Hallucination Rate

---

# Evaluation

Define evaluation methodology.

Possible metrics:

- Accuracy

- Groundedness

- Helpfulness

- Teaching Quality

- Personalization

- Safety

---

# Dependencies

Document dependencies on:

Other agents

Knowledge sources

Infrastructure

Shared state

External APIs

---

# Success Criteria

The agent is considered successful when:

- Business objectives achieved

- AI metrics acceptable

- User experience satisfactory

- Observability healthy

---

# Future Enhancements

Potential improvements.

New tools.

Additional events.

Future capabilities.

---

# Open Questions

List unresolved architectural questions.

---

# Change Log

| Version | Date | Changes |
|----------|------|----------|
| 1.0 | Initial Draft | Initial Template |