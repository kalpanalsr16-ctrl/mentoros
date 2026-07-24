# ADR-008: A custom Observability Agent powers in-product transparency; Langfuse is reserved for later engineering-side monitoring

**Status:** Accepted (reconciles a prior documentation conflict)
**Source:** [`06_Technical_Architecture.md`](../../06_Technical_Architecture.md) §10 (as amended), [`15_Phase2_Roadmap.md`](../../15_Phase2_Roadmap.md)

## Context

`06_Technical_Architecture.md` originally recommended Langfuse (from M1) as *the* AI-quality monitoring tool, and explicitly called building custom dashboards from the raw `events` table "rejected for now." Neither happened as written: Langfuse was never integrated — no account, credentials, or code for it exist anywhere in this repository — and a later milestone (M9) built exactly the custom, events-table-based approach that earlier text had called rejected. The two statements sat uncorrected in the same document until this ADR (and the underlying doc fix) reconciled them.

## Decision

Two genuinely different things, not one tool doing both jobs:

- **Observability Agent + AI Transparency Panel** (shipped): a read-only aggregation over `events` (`getObservabilityReport()`), surfaced in-product as the collapsible chat panel, the per-message "View reasoning" action, and the standalone Architecture Explorer. Real-time, per-turn, in-app.
- **Langfuse** (proposed, not implemented): reserved for a later, separate engineering-side evaluation platform — an offline regression harness, benchmark datasets, AI-quality trend reports over time. Different audience (engineering/product, not a student or teacher mid-session), different cadence (batch/offline, not per-turn).

## Consequences

- The in-product transparency story that's actually demoable today (a real student or teacher inspecting a real trace, live) needed no external vendor, no account setup, and no credential to manage — it's just a query over data the pipeline was already writing.
- Nothing about this decision blocks adopting Langfuse later for its actual intended job (regression detection over time) — it was never wired into the per-turn path to begin with, so adding it for offline analysis doesn't require removing or replacing anything.
- General lesson worth carrying forward: when an early architecture doc names a vendor for a job the system ends up solving a different way, the doc has to be corrected explicitly (as this ADR and the underlying §10 rewrite did) — not left standing to make the next reader think a decision was reversed when it was actually just never executed as written.
