# Parent Portal

Architecture only, per this phase's brief — no implementation. The smallest of the three experiences (matches `03_User_Personas.md`'s Persona 4 scope: summaries and visibility, not authoring tools).

---

## New schema this experience requires

| Table | Columns (proposed) | Purpose |
|---|---|---|
| `parent_links` | `id`, `parent_id references profiles(id)`, `student_id references profiles(id)`, `status text check (status in ('pending','verified','revoked'))`, `created_at` | Links a parent account to a student. **`status` exists specifically because this cannot be a bare join** — see `00_Overview.md`'s Open Flags: a real consent/verification flow (e.g. the student or an existing guardian approves the link) is required before `status = 'verified'`, and that flow's exact mechanics are a product/legal decision this document does not make. |

**RLS shape (proposed):** parent reads student data only where a `parent_links` row exists with `parent_id = auth.uid() AND status = 'verified'`. Every table this portal reads (`learner_concept_mastery`, `learner_profiles`, achievement/revision data) needs this same join-and-status-check pattern, applied consistently — specified once here, referenced by `10_API_Contracts.md`.

---

## Weekly Summary — `/parent` (dashboard home)

- **Purpose:** The single most important artifact this portal produces — a plain-language weekly digest, not a raw data dump.
- **Data:** aggregated from the sections below, generated on a schedule (weekly) or on-demand — generation mechanism (scheduled job vs. on-request compute) is an implementation-time decision, not resolved here.
- **Components:** `Card`-based summary with 3–4 short bullet-style highlights ("Aisha practiced Addition 4 times this week and improved from 62% to 78% mastery"), reusing `body-lg` copy register from the Design System, not a dense table — a parent audience wants the headline, not the spreadsheet (contrast with Teacher Studio's density allowance).

## Progress — section within `/parent/children/:studentId`

- **Data:** same `learner_concept_mastery` source Student Experience's own Progress screen reads — a second, parent-scoped reader, not a new computation.
- **Components:** `ProgressRing` grid, simplified (fewer concepts shown at once than the student's own view — a parent needs the headline, not every concept).

## Strengths / Weaknesses — sections within `/parent/children/:studentId`

- **Data:** the same derived weak/strong concept split `PostgresLearnerStateProvider` already computes at read time (M8) — a third reader of data two other surfaces already use, no new computation.
- **Components:** two short `Card` lists, plain-language concept names (not internal IDs).

## Recommendations — section within `/parent/children/:studentId`

- **Data:** surfaces the same "suggested next step" logic Assessment Agent's `recommendedNextStep` field already produces, aggregated across recent turns.
- **Components:** single `Card`, one clear suggestion — never a long list (Design Principle 1.2 applies to parent-facing surfaces too).

## Revision Status — section within `/parent/children/:studentId`

- **Data:** reads the same `revision_schedule` table proposed in `02_Student_Experience.md` — parent-scoped view of what's due.
- **Components:** short list, due-soon items only (not the full planner a student sees).

## Achievements — section within `/parent/children/:studentId`

- **Data:** reads the same `achievements_earned` table proposed in `02_Student_Experience.md`.
- **Components:** compact badge row, celebratory but restrained (reuses `AchievementBadge`, no `duration-celebratory` animation on this read-only, retrospective view — that motion is reserved for the student's own unlock moment).

## Notifications — cross-cutting, not a single screen

- **Purpose:** weekly summary ready, significant achievement unlocked, concept newly mastered.
- **Mechanism:** out of scope for this document to fully design (email vs. in-app vs. push is a product/infra decision) — named as a required capability with no channel commitment made here.

## Learning Insights — section within `/parent/children/:studentId`

- **Purpose:** the most open-ended section — plain-language pattern observations ("tends to practice best in the evening," derived from `12_Learner_Profile_Model.md`'s "Learning Behaviour" category, itself flagged in `15_Phase2_Roadmap.md` as unimplemented).
- **Data:** **depends on Learning Behaviour data that doesn't exist yet** (session length, time-of-day patterns) — this section cannot be built until that underlying analytics work is done elsewhere first. Named here as the Parent Portal's one real forward dependency, not silently assumed available.
- **Components:** not designed further until its data dependency is resolved.
