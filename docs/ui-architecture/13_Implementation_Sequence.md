# Implementation Sequence

The execution checklist. Every task is sized to be one pull request. Complexity is t-shirt sized (**S** = under a day, **M** = 1–3 days, **L** = 3–5 days) since no team velocity data exists yet to estimate hours against. Sequenced so no task depends on a task listed after it.

**One standing rule across every task below:** every PR that touches `/api/chat`, `web/src/lib/agents/*.ts`, or `web/src/lib/llm/client.ts` is marked **⚠ Touches completed architecture** and requires explicit product-owner sign-off beyond this document's own authority, per every constraint given since Phase 2 began — this document schedules those tasks for completeness (streaming is a real, named gap) but does not treat itself as having already approved them.

---

## Epic A — Design System Implementation (Phase 1)

| # | Task | Files (proposed) | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| A1 | Token files | `design-system/tokens/{colors,typography,spacing,motion,breakpoints}.ts` | Design System approval | Every token in `docs/design-system/02-Technical-Design-Foundations.md` exists as a typed export | Contrast-ratio assertion per §16 pairing | S |
| A2 | Font loading | `layout.tsx` (add Fraunces via `next/font/google`) | A1 | Fraunces 400/500 loads alongside existing Geist | Visual check on one heading | S |
| A3 | Icon wrapper | `design-system/icons/index.ts` | — | Lucide installed, tree-shaken re-export wrapper exists | Bundle-size check (no full-icon-set import) | S |
| A4 | Primitives batch 1 | `design-system/primitives/{Button,Input,Textarea,Badge,Avatar,Divider}/` | A1 | Each matches `docs/design-system/03-Component-Library.md` §7.2's state list | Unit test per state (default/hover/focus/disabled) | M |
| A5 | Primitives batch 2 | `.../{Card,Select,Checkbox,Radio,Skeleton,Spinner}/` | A1 | Same as A4 | Same as A4 | M |
| A6 | Primitives batch 3 | `.../{Modal,Tooltip,Toast,Tabs,Table,ProgressRing,ProgressBar}/` | A4, A5 (Modal/Tooltip compose Card/Button) | Same as A4; Modal focus-traps per Accessibility §16 | Keyboard-nav test for Modal/Tabs | L |
| A7 | Empty/Loading/Error patterns | `design-system/patterns/{EmptyState,LoadingState,ErrorState}/` | A4–A6 | Matches `docs/design-system/05-Motion-And-States.md` copy/behavior rules exactly | Snapshot test per named context in §18/§20 | M |

## Epic B — Repository Hardening (Phase 1.5)

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| B1 | Port test suite into repo | `web/tests/` (new), scratchpad `.mts` files ported | — | All 179 prior assertions run via `npm test` inside the repo | The ported suite itself is the test | M |
| B2 | GitHub Actions CI | `.github/workflows/ci.yml` | B1 | `npm run build`, `npm run lint`, `npm test` all run on every PR | CI run against this PR itself | S |
| B3 | Fix `messages` RLS role gap | `supabase/migrations/000X_messages_role_rls.sql` | — | ⚠ Touches completed architecture (a migration on an M0 table) — INSERT policy additionally checks `role != 'assistant' OR auth.role() = 'service_role'` | RLS test: authenticated student cannot insert `role: 'assistant'` | S |
| B4 | Reconcile Langfuse doc conflict | `06_Technical_Architecture.md` | — | Doc states Observability Agent (in-product) + Langfuse (Phase 5, engineering-side) as the accepted "run both" decision, per the resolved Phase 2 roadmap decision | Doc review only | S |

## Epic C — Application Shell & Roles (Phase 1)

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| C1 | `profiles.role` migration | `supabase/migrations/000X_profiles_role.sql` + rollback | B3 (same migration window) | Column added, default `'student'`, every existing row valid | Migration applies cleanly against a copy of staging data | S |
| C2 | Role-aware post-sign-in redirect | `web/src/proxy.ts`, sign-in flow | C1 | Student → `/app`, Teacher → `/studio`, Parent → `/parent` | Manual QA, one account per role | S |
| C3 | Student app-shell layout | `web/src/app/app/layout.tsx` | A4–A6 | Matches Design System §9.1 nav | Visual QA at each breakpoint (§15) | M |
| C4 | Landing page rebuild | `web/src/app/page.tsx` | A4–A6 | Replaces "Coming soon" per Design System §Marketing template | Visual QA, Lighthouse pass | M |

## Epic D — Chat Experience Upgrade (Phase 1 → 2)

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| D1 | `MessageBubble` pattern | `design-system/patterns/MessageBubble/` | A4–A6 | Three variants (student/assistant/safety) per Design System §7.3 | Visual QA all three variants | M |
| D2 | Markdown rendering | `MessageBubble`, new renderer dependency | D1 | Headings/lists/bold/inline-code render correctly | Snapshot test against sample agent output | M |
| D3 | LaTeX rendering | `MessageBubble`, KaTeX (or equivalent) dependency | D1 | `\frac{1}{2}`-style notation renders correctly | Snapshot test against sample math content | M |
| D4 | Streaming | `web/src/lib/llm/client.ts`, `route.ts`, `MessageList` reducer | D1 | ⚠ **Touches completed architecture** — `stream: true` on relevant Anthropic calls; frontend renders token-by-token per `11_State_Management.md` §4 | Manual QA + latency comparison against non-streaming baseline | L |
| D5 | Practice/Assessment card rendering | `PracticeQuestionCard`, `AssessmentFeedbackCard` wired into Chat | A5, A6, D1 | Structured cards replace flattened text for Practice/Assessment replies | Visual QA against real Practice/Assessment turns | M |
| D6 | Safety message styling | `MessageBubble`'s safety variant wired to real decline events | D1 | Safety declines render calm, non-error styled, per Design System §13.3 | Manual QA with a real safety-trigger phrase | S |
| D7 | Memory-update inline note | Chat stream, new lightweight UI element | D1 | Appears only on real `learner_profile_updated` events, dismissible | Manual QA after a real Assessment turn | S |

## Epic E — AI Transparency Panel (Phase 2, flagship)

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| E1 | `events` self-read RLS policy | `supabase/migrations/000X_events_self_read.sql` | — | ⚠ Touches completed architecture (M0 table's RLS) — new SELECT policy, `student_id = auth.uid()` | RLS test: student reads own events, not another student's | S |
| E2 | `GET /api/observability/trace/:traceId` | `web/src/app/api/observability/trace/[traceId]/route.ts` | E1 | Thin wrapper around existing `getObservabilityReport()`, auth-checked | Integration test against a real trace | S |
| E3 | `AgentTraceNode` / `EvaluationScoreCard` patterns | `design-system/patterns/{AgentTraceNode,EvaluationScoreCard}/` | A4–A6 | Matches `07_AI_Transparency_Panel.md`'s per-agent field list exactly | Snapshot test per agent section | M |
| E4 | Transparency panel + Chat integration | New panel component, `ChatShell` wiring | E2, E3 | Collapsible, off by default for students, matches wireframe in `05_Chat_Experience.md` | Manual QA: expand, verify every pipeline node's data | L |
| E5 | Per-message "View reasoning" action | `MessageBubble` action row | E4 | Opens panel pre-scoped to that message's `trace_id` | Manual QA | S |
| E6 | Architecture Explorer page | `web/src/app/explorer/`, `GET /api/observability/recent` | E2, E3 | Full-page reuse of E3/E4's components, per `06_Dashboard_Architecture.md` | Manual QA against several real traces | L |

## Epic F — Student Experience (Phase 3)

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| F1 | Onboarding flow | `web/src/app/app/onboarding/`, `PATCH /api/student/profile` | C3 | 4-step flow per `docs/design-system/04-UX-Design-Experiences.md` §11.2 | Manual QA, skip-after-grade path | M |
| F2 | Student Dashboard | `web/src/app/app/page.tsx`, `GET /api/student/dashboard` | C3, A5 (StatTile — flag as new pattern per `08`) | Matches `02_Student_Experience.md` spec exactly, incl. empty/loading/error | Unit test on API aggregation; visual QA on states | M |
| F3 | Learning Roadmap + `RoadmapPath` | `web/src/app/app/roadmap/`, `GET /api/student/roadmap`, new `RoadmapPath` pattern | F2 | New pattern added to Design System per `08_Component_Ownership.md` | Visual QA against real curriculum data | M |
| F4 | Progress | `web/src/app/app/progress/`, `GET /api/student/progress` | F2 | Reuses `ProgressRing`; weak/strong split matches existing derived data | Unit test on API; visual QA | S |
| F5 | Practice + Assessment History | `web/src/app/app/{practice,assessment}/`, both `GET` endpoints | E1 (events self-read) | Both screens per `02_Student_Experience.md` | Unit test on API; empty-state QA | M |
| F6 | Revision Planner | `revision_schedule` migration, screen, `GET /api/student/revision` | F2 | ⚠ New scheduling logic explicitly out of this task's scope — screen renders whatever's in the table; population mechanism is a separate, later task | Manual QA with manually-seeded rows | M |
| F7 | Achievements + `AchievementBadge` | `achievements_earned` migration, screen, `GET /api/student/achievements`, new pattern | F2 | New pattern added to Design System per `08`; streak computed correctly from `messages` | Unit test on streak calculation | M |
| F8 | Profile + Settings | `web/src/app/app/{profile,settings}/`, both endpoints | F2 | Profile writes only preference fields, never mastery fields | Unit test asserting mastery fields untouched by this write path | S |

## Epic G — Teacher Studio (Phase 4)

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| G1 | `classes`/`class_students` migration + Studio shell | Migration + `web/src/app/studio/layout.tsx` | C1, C2 | Matches Design System §9.2 sidebar nav | Visual QA at each breakpoint | M |
| G2 | Studio Dashboard | `web/src/app/studio/page.tsx`, `GET /api/teacher/dashboard` | G1 | Three action tiles per wireframe | Visual QA | S |
| G3 | Classes + Class Overview | `web/src/app/studio/classes/`, both endpoints | G1 | Roster table, aggregate mastery view | Unit test on aggregation; RLS test on ownership | M |
| G4 | Student Overview | `web/src/app/studio/students/[studentId]/`, endpoint | G3 | **403 without a verified `class_students` relationship** | RLS/authz test is the primary acceptance criterion here | M |
| G5 | `CurriculumProvider` interface + `PostgresCurriculumProvider` | `web/src/lib/curriculum/curriculum-provider.ts`, `postgres-curriculum-provider.ts` | — | New interface, does not modify `KnowledgeProvider`/`ConceptSearchProvider` | Unit test confirms zero changes to existing knowledge-provider files (diff check) | M |
| G6 | Curriculum Explorer + `LearningCommonsCurriculumProvider` | Screen + REST provider implementation | G5, Learning Commons API key provisioned | Source-attribution badge on every external result, per Design System §12.3 | Integration test against Learning Commons REST API (or a recorded fixture) | L |
| G7 | `LearningCommonsMcpCurriculumProvider` | New provider implementation | G6 | Same interface, MCP transport, same source-attribution behavior | Integration test against the MCP endpoint (or fixture) | M |
| G8 | Lesson Planner | `lesson_plans` migration, screen, endpoints | G5 | Multi-step authoring flow per Design System §12.4 | Manual QA end-to-end authoring flow | L |
| G9 | Assessment Builder | `assessments_authored` migration, screen, endpoints | G5 | Same pattern as G8 | Manual QA | M |
| G10 | Misconception Reports | Screen, endpoint | E1 | Aggregates existing `assessmentReport.misconceptions` correctly | Unit test on aggregation logic | M |
| G11 | Progress Analytics | Screen, endpoint | G3 | Trend view over a real date range | Unit test on trend computation | M |
| G12 | Intervention Planner | Screen, endpoint | G4, G10 | ⚠ New suggestion logic flagged as its own scoping item, not designed in full by `03_Teacher_Studio.md` — this task should not proceed without that scoping done first | — | L |
| G13 | Homework Generator | Screen, endpoint | G5, A5/A6 (`PracticeQuestionCard`) | Reuses Practice Agent's generation *pattern* via a new, teacher-facing wrapper — does not modify `practice-agent.ts` | Unit test confirms `practice-agent.ts` untouched | M |
| G14 | AI Lesson Assistant | `teacher_conversations`/`teacher_messages` migration, screen, endpoint | D1 (`MessageBubble` reuse) | Structurally separate data domain from student `conversations`/`messages`, confirmed by migration review | RLS test: teacher cannot read student conversations via this path or vice versa | L |

## Epic H — Parent Portal

*Not mapped to one of the roadmap's 8 named phases — sequenced here because it reuses Epic G's access-control patterns and several of Epic F's components. Exact phase-number placement is a sequencing question for the product owner, not assumed by this document.*

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| H1 | `parent_links` migration + Parent shell | Migration + `web/src/app/parent/layout.tsx` | C1 | `status` column present; **no read access granted until `status = 'verified'`** | RLS test: `pending` status grants zero access | M |
| H2 | Link-request flow (data layer only) | `POST /api/parent/link-request` | H1 | Creates `pending` row; **the actual verification mechanism is explicitly out of scope**, per `00_Overview.md`'s Open Flags — this task only proves the data shape | Unit test on state transition, not on the (undesigned) verification UX | S |
| H3 | Parent Dashboard + Child Detail | Screens, both endpoints | H1, F4 (reuses Progress components) | Every section reuses an existing pattern, per `08_Component_Ownership.md`'s "explicitly not duplicated" rule | Unit test on aggregation; RLS test on link status | L |

## Epic I — Evaluation Dashboard (Phase 5, UI portion only)

| # | Task | Files | Depends on | Acceptance Criteria | Testing | Size |
|---|---|---|---|---|---|---|
| I1 | Evaluation Dashboard shell | `web/src/app/studio/evaluation/` (or standalone, per `06`'s note on audience) | E1, E3 | Renders existing Evaluation Agent data; regression-alert card present but unpopulated until Phase 5's backend harness exists | Visual QA against real `evaluation_completed` events | M |

---

## Sequencing summary

```
A (Design System) ──┬── B (Repo Hardening) ── C (Shell & Roles) ──┬── D (Chat Upgrade) ── E (AI Transparency)
                     │                                             │                           │
                     └─────────────────────────────────────────────┴── F (Student) ── H (Parent)│
                                                                     │                           │
                                                                     └── G (Teacher Studio) ──────┴── I (Evaluation Dashboard)
```

Epics A and B can start in parallel. C depends on both. D and F can proceed in parallel once C is done; E depends on D1 (MessageBubble) existing. G depends on C and, for its Learning Commons tasks specifically, on the operational prerequisite (API key) already named in `15_Phase2_Roadmap.md`. H depends on both C and pieces of F. I is the last, smallest epic, gated on E's transparency infrastructure existing first.
