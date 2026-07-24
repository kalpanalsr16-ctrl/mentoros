# ADR-002: An `events` table substitutes for a message broker

**Status:** Accepted
**Source:** [`06_Technical_Architecture.md`](../../06_Technical_Architecture.md), Decision 2; [`14_Event_Driven_Architecture.md`](../../14_Event_Driven_Architecture.md)

## Context

The product is described in explicitly event-driven terms — "a safety decline event," "an assessment-completed event" — which normally implies a message broker (Kafka, SQS, etc.) so multiple independent consumers can react to the same event without coupling to the producer.

## Decision

Every agent call and pipeline decision writes a row to a single Postgres `events` table (`trace_id`, `event_name`, `student_id`, `payload`, `created_at`), inserted via direct function calls within the same request — not published to a broker and consumed asynchronously.

## Consequences

- The "event-driven" *shape* is real (every meaningful thing that happens is a named, timestamped, payload-carrying record), but the *mechanism* is a database table read directly by whoever needs it later — the Observability Agent, the AI Transparency Panel, teacher-scoped Progress Analytics, the Evaluation Dashboard, and Misconception Reports are all just different queries over the same table, not separate subscribers.
- This is also the entire basis of the Observability Agent (ADR-008) and every teacher/parent RLS-scoped read this product has: `events` has one self-read policy (student) plus additive teacher/parent-scoped policies, never a second copy of the data.
- Reconsideration trigger: adopt a real broker only when true parallel agent execution, independent retries, or multiple genuinely unrelated systems reacting to the same event become a real production need — a signal that would come from actual pain, not from re-reading this document.
