# ADR-007: The Evaluation Dashboard is teacher-scoped, not a new admin role

**Status:** Accepted
**Source:** [`06_Dashboard_Architecture.md`](../ui-architecture/06_Dashboard_Architecture.md) (Evaluation Dashboard's audience framing)

## Context

The doc describes the Evaluation Dashboard's audience as platform-wide — "Engineering Teams," "Product Teams" — implying a cross-student, cross-class view. The actual schema has no such role: `profiles.role`'s check constraint only ever allows `'student' | 'teacher' | 'parent'`, and no cross-student read policy exists anywhere for AI-quality data.

## Decision

Ship the dashboard scoped to a teacher's own students, reusing the exact class-scoped RLS pattern already proven for Progress Analytics — rather than inventing a new `admin` role and a new cross-student access model to match the doc's platform-wide framing.

## Consequences

- Zero new access-control surface: the dashboard's authorization is identical in shape to every other teacher-scoped screen (Progress Analytics, Misconception Reports, Class Overview), reviewed and RLS-tested the same way.
- The doc's platform-wide/engineering-audience vision isn't implemented — a genuine gap against that framing, named here rather than silently narrowed. Building the actual cross-platform version requires a real product decision (does an admin role get added? who can see cross-teacher data, and under what consent model, given students are children?) that this ADR deliberately does not make on its own.
- This mirrors the same kind of resolution Parent Portal's consent gate and the Langfuse/Observability-Agent conflict (ADR-008) both needed: when a doc's framing and the schema's actual capability diverge, the gap is surfaced and a scoped decision is made explicitly, not guessed at silently.
