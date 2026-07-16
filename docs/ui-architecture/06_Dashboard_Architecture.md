# Dashboard Architecture

Applies the Design System's shared dashboard grammar (`docs/design-system/04-UX-Design-Experiences.md` §14: StatTile row → primary content + side panel) concretely to every dashboard-shaped screen in the product. No dashboard below invents its own layout — this document exists specifically to prevent that.

---

## Student Dashboard (`/app`)

- **Widgets:** continue-learning prompt, mastery snapshot, streak.
- **Charts:** none — mastery is shown via `ProgressRing`, not a chart, at this screen's summary level (full mastery detail lives at `/app/progress`, doc `02`).
- **Cards:** revision suggestion (single).
- **Tables:** none.
- **Filters:** none — this screen is deliberately not configurable, per Design Principle 1.2.
- **Navigation:** entry point only; no internal tabs/sections.

## Teacher Studio Dashboard (`/studio`)

- **Widgets:** 3 action tiles (Plan a Lesson / Build an Assessment / Explore Curriculum), StatTile row (classes, students, recent activity).
- **Charts:** none at this top level — trend visualization is Progress Analytics' job (`03_Teacher_Studio.md`), not duplicated here.
- **Cards:** recent-activity feed.
- **Tables:** none.
- **Filters:** none.
- **Navigation:** sidebar (Design System §9.2) persists across every Studio screen; this is the landing view only.

## Parent Dashboard (`/parent`)

- **Widgets:** weekly summary card (the screen's entire purpose, per `04_Parent_Portal.md`).
- **Charts:** none.
- **Cards:** one per linked child, if a parent has more than one (a real case this document should account for even though `04_Parent_Portal.md`'s per-section detail assumes a single child for brevity — the dashboard fans out to N `Card`s, each linking to that child's `/parent/children/:studentId`).
- **Tables:** none.
- **Filters:** child selector, only if more than one linked child exists.
- **Navigation:** minimal — this portal has no sidebar; each child card is the only way deeper.

## Administrator Dashboard (future) — not designed

Named for completeness per the brief's own list. No role, no schema, no screen designed in this phase — see `12_Future_Extensibility.md` for why and where it plugs in later.

## Architecture Explorer (`/explorer`)

- **Widgets:** trace search/lookup (by `trace_id` or recent-conversation list), pipeline summary stats (total interactions, average latency, error rate — all from `getObservabilityReport`'s existing aggregation, `web/src/lib/agents/observability-agent.ts`).
- **Charts:** latency-over-time, cost-over-time (both read directly from the token-logging data every agent now writes, per the already-shipped Token-Logging Housekeeping Pass — no new backend work to source this, only new frontend consumption).
- **Cards:** one `AgentTraceNode` per pipeline stage for the selected trace (full detail: `07_AI_Transparency_Panel.md`).
- **Tables:** recent-traces list (trace ID, workflow type, timestamp, error count) — reuses `ObservabilityReport`'s existing shape almost directly.
- **Filters:** date range, workflow type (Concept/Practice/Assessment/Safety Blocked, matching `inferWorkflow()`'s existing categories), error-only toggle.
- **Navigation:** standalone page, reached from Teacher Studio's sidebar and via direct link (for showcase reviewers — see `12_Future_Extensibility.md`).

## Evaluation Dashboard (Phase 5 dependency, designed now so the shell doesn't need reshaping later)

- **Widgets:** overall quality score trend, safety-clean rate, hallucination-risk rate — all sourced from Evaluation Agent's existing per-turn `EvaluationReport` output, aggregated over time (the "AI quality trend reports" named in `15_Phase2_Roadmap.md`'s Phase 5).
- **Charts:** score-over-time per dimension (groundedness/accuracy/educationalQuality/personalization/clarity/safety), matching `07_Evaluation_Framework.md`'s existing six dimensions exactly — no new dimension invented here.
- **Cards:** regression-detected alert card (only appears when Phase 5's regression framework flags a drop — not populated by anything that exists yet).
- **Tables:** low-quality/high-hallucination-risk interaction list, sourced from existing `low_quality_detected`/`hallucination_detected` events.
- **Filters:** date range, source agent (Concept/Practice/Assessment), quality-status.
- **Navigation:** own top-level entry once Phase 5 ships; not part of Teacher Studio's sidebar (this is an engineering/quality surface, not a teaching tool — different audience than the rest of Studio).

---

## Cross-dashboard rule

Every chart across every dashboard above uses the Design System's color tokens exactly (`docs/design-system/02-Technical-Design-Foundations.md` §3) — `brand-indigo` for primary series, `success`/`warning`/`danger` for status-coded data, never an invented chart-specific palette. Detailed charting conventions (axis treatment, legend placement, tooltip design) remain deliberately deferred to whichever phase first implements a real chart, evaluated against that chart's actual data — consistent with the Design System's own scoping note (`04-UX-Design-Experiences.md` §14.1).
