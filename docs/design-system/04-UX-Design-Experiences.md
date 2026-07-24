# UX Design — Navigation, Layout, and Experiences

Lifecycle stage 2 of 4 (UX Design). Covers: Navigation, Layout Rules, Student Experience, Teacher Experience, Chat Experience, Dashboard Layouts. Wireframes below are low-fidelity ASCII, intended to communicate structure and hierarchy — not final visual design.

---

## 9. Navigation

Per Design Principle 1.6 (two audiences, one system), Student and Teacher navigation are deliberately different shapes, not the same shell restyled.

### 9.1 Student navigation — minimal, single-path
No persistent sidebar, no multi-section chrome. A thin top bar only:

```
┌──────────────────────────────────────────────────┐
│ MentorOS            [progress: 🔥3-day]   [avatar]│
├──────────────────────────────────────────────────┤
│                                                    │
│                  (chat, full height)               │
│                                                    │
└──────────────────────────────────────────────────┘
```
The student's entire world is chat plus, from Phase 2.3 onward, one additional destination (progress/roadmap) reached from the avatar menu — never a nav bar with many items. This is deliberate: a young learner should never have to decide "where do I go," per Design Principle 1.2.

### 9.2 Teacher navigation — sidebar app shell
```
┌──────────┬─────────────────────────────────────────┐
│ MentorOS │  Curriculum Explorer                     │
│          │  ─────────────────────────────────────  │
│ Studio   │                                           │
│ Curric.  │        (section content)                 │
│ Classes  │                                           │
│ Reports  │                                           │
│          │                                           │
│ [avatar] │                                           │
└──────────┴─────────────────────────────────────────┘
```
Standard professional-tool pattern (persistent left sidebar, 4–5 top-level sections: Studio, Curriculum Explorer, Classes, Reports). Collapses to a bottom tab bar below `md` (doc 02 §15).

### 9.3 Rule
No component or layout primitive is shared *as a nav shell* between the two — but every item inside each (buttons, cards, type) comes from the same primitive set (doc 03). This is what "one system, two experiences" means concretely.

---

## 10. Layout Rules

Four page templates cover the entire product; no page should need a fifth without a deliberate new template decision:

1. **Auth template** — centered single card, max-width 400px, no nav chrome. (`/sign-in`, `/sign-up`)
2. **Focus template** — Student navigation shell (§9.1) + one full-height content region. (`/chat`)
3. **App-shell template** — Teacher navigation shell (§9.2) + scrollable content region with its own internal padding (`space-8` desktop / `space-4` mobile). (Teacher Studio, all sections)
4. **Marketing template** — no app chrome, full-width hero + sectioned content, footer. (`/`, and any future public pages)

**Consistent rules across all four:**
- Content max-width follows the Grid System (doc 02 §6) — never full-bleed text.
- Vertical rhythm between sections uses `space-8`/`space-12`/`space-16` only (doc 02 §5) — no arbitrary gaps.
- Every page has exactly one `display-*` or `heading-lg` element as its title — never zero, never two competing ones.

---

## 11. Student Experience

### 11.1 Principles applied
Minimal chrome (§9.1), large touch targets (doc 02 §15), warm-but-restrained color use (amber spent only on real achievement, doc 02 §3.3), reading-level-appropriate copy (doc 01 §2.2), no time pressure (Design Principle 1.5).

### 11.2 Onboarding flow (Phase 2.3 dependency, designed now so Phase 1's chat work doesn't block it later)
```
Step 1            Step 2              Step 3            Step 4
┌─────────┐      ┌─────────┐        ┌─────────┐       ┌─────────┐
│ Welcome │  →   │ Grade?  │   →    │ Goals?  │  →    │ Start!  │
│         │      │ (chips) │        │(chips,  │       │         │
│         │      │         │        │ multi)  │       │         │
└─────────┘      └─────────┘        └─────────┘       └─────────┘
```
Four short steps, one question per screen (Design Principle 1.2), chip-based single-tap selection wherever possible (minimizes typing for young learners), skippable after step 2 (grade is the only hard requirement — Personalization Agent already degrades gracefully without the rest, per its existing fail-open design).

### 11.3 Progress / mastery view (Phase 3 dependency)
```
┌──────────────────────────────────────────┐
│  Your Learning                            │
│                                            │
│  Addition & Subtraction        ●●●●○ 82%  │
│  Multiplication                ●●○○○ 41%  │
│                                            │
│  🔥 3-day streak                          │
│                                            │
│  Suggested: Revise "Carrying in Addition" │
└──────────────────────────────────────────┘
```
Ring/dot mastery indicator (not a raw percentage-only number — visual encoding matters for this age group), streak shown but not gamified beyond a simple count (Design Principle 1.5's no-pressure rule), one clear "what next" suggestion rather than an open-ended list.

---

## 12. Teacher Experience

### 12.1 Principles applied
Higher information density permitted (doc 02 §15's 40px touch-target allowance), professional copy register (doc 01 §2.2), explicit source attribution for anything pulled from Learning Commons (trust/provenance, Design Principle 1.3 extended to external data).

### 12.2 Teacher Studio home (Phase 4)
```
┌──────────┬────────────────────────────────────────────┐
│          │  Studio                                     │
│          │  ┌────────────┐ ┌────────────┐ ┌──────────┐│
│  (nav)   │  │ Plan a      │ │ Build an    │ │ Explore  ││
│          │  │ Lesson      │ │ Assessment  │ │ Curric.  ││
│          │  └────────────┘ └────────────┘ └──────────┘│
│          │                                              │
│          │  Recent activity ...                         │
└──────────┴────────────────────────────────────────────┘
```
Three clear entry points matching the roadmap's named Phase 4 use cases, not a dense unstructured dashboard on first load.

### 12.3 Curriculum Explorer — source attribution pattern
```
┌────────────────────────────────────────────┐
│  4.OA.A.3 — Solve multistep word problems…  │
│  [Learning Commons]  Grade 4 · Math          │
│  ──────────────────────────────────────────  │
│  Prerequisites: 3.OA.A.3, 3.NBT.A.2          │
│  Related MentorOS concepts: none yet          │
└────────────────────────────────────────────┘
```
Every card sourced from an external `CurriculumProvider` implementation (per the Phase 2 roadmap's provider design) carries a visible source badge (`[Learning Commons]`, Chip primitive) — a teacher must always be able to tell MentorOS's own curriculum apart from an external source at a glance. This is a hard requirement, not a nice-to-have: it's the visual expression of the roadmap's own "MentorOS remains the source of truth" decision.

### 12.4 Assessment builder / lesson planning
Multi-step authoring flow (outline → detail → review), not a single long form — same one-idea-at-a-time principle as Student Experience's onboarding, just with more fields per step given the professional-tool density allowance.

---

## 13. Chat Experience

### 13.1 Current state → target state
Today: flat plain-text bubbles, no streaming, no structure. Target (Phase 1–2): streaming Markdown/LaTeX rendering, structured cards for Practice/Assessment output (not flattened text), and an AI Transparency panel — all using the MessageBubble/PracticeQuestionCard/AssessmentFeedbackCard/AgentTraceNode patterns (doc 03).

### 13.2 Wireframe — chat with transparency panel expanded (Phase 2)
```
┌────────────────────────────────────┬─────────────────┐
│  MentorOS                           │  How I answered  │
├──────────────────────────────────────┤  ▸ Safety: Allow │
│                                      │  ▸ Router: Concept│
│         [student message]           │  ▸ Evaluation: 92 │
│  [assistant message, structured]    │  ▸ 1.2s · $0.004  │
│  ┌────────────────────────────────┐ │                  │
│  │ Practice: 3 questions           │ │                  │
│  │ 1. 24 + 18 = ?     [___]        │ │                  │
│  └────────────────────────────────┘ │                  │
│                                      │                  │
├──────────────────────────────────────┤                  │
│ [Ask a question...]          [Send] │                  │
└────────────────────────────────────┴─────────────────┘
```
The transparency panel (right) is collapsible and off by default on Student surfaces (keeps the default experience minimal-chrome, per §11.1) but always available — a deliberate expression of Design Principle 1.3 ("show your work") without forcing it on every student by default. On Teacher Studio surfaces reviewing a transcript, it can default open, since that audience wants exactly this detail.

### 13.3 Safety decline treatment
Uses the dedicated `safety` color family (doc 02 §3.5), not `danger` — visually calmer than an error, with a short, plain explanation and (where applicable) a suggested alternative action. Never rendered with alarm iconography.

### 13.4 Message attribution
Each assistant message can optionally show a small `caption`-styled tag (e.g. "Concept Agent") when the transparency panel is open — ties the visible reply back to the pipeline stage that produced it, reusing the `AgentTraceNode` pattern's naming.

---

## 14. Dashboard Layouts

Shared grammar for every dashboard-shaped screen (Student progress, Teacher reports, and — later — the Evaluation Platform's quality reports), so they don't each invent their own layout.

### 14.1 Standard dashboard grid
```
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ Stat  │ │ Stat  │ │ Stat  │ │ Stat  │   ← StatTile row, 4→2→1 reflow (doc 02 §15)
│ Tile  │ │ Tile  │ │ Tile  │ │ Tile  │
└───────┘ └───────┘ └───────┘ └───────┘
┌─────────────────────────┐ ┌─────────┐
│                          │ │         │
│   Primary chart/table    │ │  Side   │
│                          │ │  panel  │
└─────────────────────────┘ └─────────┘
```
- Row 1: up to 4 `StatTile`s, most important metric first (reading order = priority order).
- Row 2: one primary content area (chart, table, or list) at ~2/3 width, one supporting panel (recent activity, suggested action) at ~1/3 width.
- Any chart/visualization work in this row follows this design system's tokens for color/type (doc 02) — detailed charting conventions (axis treatment, series color assignment) are deliberately out of scope for Phase 1A and belong to whichever later phase first ships a real chart, evaluated fresh against that specific data.
