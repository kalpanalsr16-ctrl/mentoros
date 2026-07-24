# Component Ownership

Every reusable component named across `01`–`07`, cross-referenced. Purpose: prevent the same visual pattern being invented twice under two different names in two different documents — the specific failure mode this document exists to catch.

**Ownership rule:** every component is owned by the Design System (`docs/design-system/`), never by a feature. A screen document (`02`–`06`) *consumes* a component; it never defines one. Where a screen needed something new, it's flagged below as a proposed Design System addition, not silently built inline.

---

## Primitives (defined in `docs/design-system/03-Component-Library.md` §7.2)

| Component | Used by |
|---|---|
| `Button` | Student Dashboard, Profile, Settings, Revision Planner, Chat (`MessageInput`), Studio (all authoring flows), Parent Portal (child selector), virtually every screen |
| `Input` | Profile, Settings, Learning Commons Integration (API key), Lesson Planner, Assessment Builder |
| `Textarea` | Chat `MessageInput`, AI Lesson Assistant, Lesson Planner content fields |
| `Select` | Profile (grade) |
| `Checkbox` / `Radio` | `PracticeQuestionCard` (answer input) |
| `Badge` / `Chip` | Profile (goals), Progress (weak/strong), Practice History (difficulty), Curriculum Explorer (source attribution — `docs/design-system/04-UX-Design-Experiences.md` §12.3), Misconception Reports |
| `Avatar` | Student nav (§9.1), Teacher nav (§9.2), MessageBubble |
| `Card` | Nearly every screen — Dashboard, Revision Planner, Achievements grid, Studio Dashboard action tiles, Parent weekly summary, Class Overview |
| `Modal` | Learning Commons connection test, class-code sharing confirmation — used sparingly by design (`docs/design-system/03-Component-Library.md` §7.2 notes MentorOS favors inline expansion) |
| `Tooltip` | Chat message actions (hover reveal) |
| `Toast` | Lesson plan saved, Assessment saved, Profile saved |
| `Tabs` | Curriculum Explorer (MentorOS / Learning Commons) |
| `Table` | Class Overview, Misconception Reports, Practice History (desktop), Progress Analytics |
| `ProgressRing` | Progress, Learning Roadmap, Student Overview (Teacher), Parent Progress section, `AssessmentFeedbackCard` |
| `ProgressBar` | Practice-set completion (within `PracticeQuestionCard`) |
| `Skeleton` | Every screen's loading state, matched to that screen's content shape (design system §19.1's rule, applied uniformly) |
| `Spinner` | Button loading state, Chat send action |
| `Divider` | General layout separation, low-frequency |

## Patterns (defined in `docs/design-system/03-Component-Library.md` §7.3)

| Component | Used by |
|---|---|
| `MessageBubble` | Chat, AI Lesson Assistant (Teacher) |
| `AgentTraceNode` | AI Transparency Panel, Architecture Explorer |
| `EvaluationScoreCard` | AI Transparency Panel (Evaluation section), Evaluation Dashboard |
| `StatTile` | Student Dashboard, Studio Dashboard, Class Overview, Architecture Explorer, Evaluation Dashboard |
| `PracticeQuestionCard` | Chat (inline), Practice History, Homework Generator (preview) |
| `AssessmentFeedbackCard` | Chat (inline), Assessment History, Student Overview (Teacher), AI Transparency Panel |
| `EmptyState` | Every screen with a possible zero-data condition (see each screen doc's own Empty State field) |
| `LoadingState` | Every screen, composed from `Skeleton`/`Spinner` per design system §19.1's rule |
| `ErrorState` | Every screen, per design system §20's copy rules |

## New patterns this phase proposes adding to the Design System

Two components were needed by screen documents `02`/`04` that don't exist in the approved Design System's component inventory — flagged here explicitly rather than built ad hoc inline, per this document's own ownership rule:

| Proposed component | Needed by | Composition |
|---|---|---|
| `RoadmapPath` | Learning Roadmap (`02_Student_Experience.md`) | Sequence of `Badge`-like nodes + connecting line, each node wrapping a `ProgressRing` |
| `AchievementBadge` | Achievements, Student Dashboard (streak), Parent Achievements section | `Badge` + `accent-amber` token family + `duration-celebratory` motion (design system §17.3), only animated on first view |

Both should be formally added to `docs/design-system/03-Component-Library.md` before implementation reaches the screens that need them — a small amendment to the approved Design System, not a bypass of it.

## Explicitly NOT duplicated

Two cases worth naming since they were the most tempting places to accidentally invent a second version of an existing pattern:

- **Teacher Studio's Student Overview reuses `ProgressRing`/`AssessmentFeedbackCard` exactly as Student Experience's own Progress/Assessment History screens do** — a teacher-scoped *data access path* (`10_API_Contracts.md`) wraps the same visual components, rather than a parallel "TeacherProgressRing" being built.
- **Parent Portal's every section reuses a Student Experience or Teacher Studio pattern at reduced density** — no Parent-specific visual component exists anywhere in this architecture; `04_Parent_Portal.md` is entirely composed from already-owned patterns.
