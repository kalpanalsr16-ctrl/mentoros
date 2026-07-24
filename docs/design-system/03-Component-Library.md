# Technical Design — Component Library & Icons

Lifecycle stage 3 of 4 (Technical Design), continued. This is an inventory and specification, not code — see doc 06 for how these map to actual files once Phase 1's Implementation stage begins.

---

## 7. Component Library

### 7.1 Organization: primitives vs. patterns
- **Primitives** — small, generic, reusable anywhere (Button, Input, Card). Own no MentorOS-specific meaning.
- **Patterns** — composed from primitives, carry real MentorOS meaning (MessageBubble, TracePanel, StatTile). Live in doc 06's proposed `patterns/` directory.

### 7.2 Primitives inventory

| Component | States | Notes |
|---|---|---|
| **Button** | default, hover, active, focus-visible, disabled, loading | Variants: `primary` (`brand-indigo-500` fill), `secondary` (outline), `ghost` (text-only), `danger` (destructive actions only). Loading state replaces label with a spinner (doc 05), never disables without visual explanation. |
| **Input** (text) | default, focus, filled, error, disabled | Error state uses `danger` border + inline message below, never color-only (Accessibility §16). |
| **Textarea** | same as Input | Used for chat's `MessageInput` upgrade and Teacher Studio's lesson-planning fields. |
| **Select** | default, open, focus, disabled | Native `<select>` semantics preserved for accessibility; custom-styled shell only. |
| **Checkbox / Radio** | default, checked, focus, disabled | 20×20px minimum hit target, larger than visual size, per touch-target rule. |
| **Badge / Chip** | — | Small pill, used for status labels (mastery level, risk level, standard codes). Uses semantic or brand tokens per context — never a bespoke color. |
| **Avatar** | — | Circular, `radius-full`. Student initials or a simple monogram — no photo-upload flow in scope for Phase 1A. |
| **Card** | default, hover (only if interactive) | Base container for nearly every composed pattern below. `radius-md`, `ink-000` surface, 1px `ink-200` border, no shadow by default (see §7.4). |
| **Modal / Dialog** | entering, open, exiting | Focus-trapped (Accessibility §16). Used sparingly — MentorOS favors inline expansion over modals where possible, per Design Principle 1.2 (one idea at a time is easier to keep true inline than in a stacked modal). |
| **Tooltip** | — | Hover/focus-triggered, short text only — never a substitute for a visible label. |
| **Toast / Notification** | entering, visible, exiting | Used for transient confirmations (e.g. "Lesson plan saved") — never for anything requiring student action, which should be inline. |
| **Tabs** | default, selected, focus | Used in Teacher Studio (Curriculum Explorer sections) — not used in Student Experience, which stays single-path per screen (Design Principle 1.2). |
| **Table** | — | Teacher Studio only (class roster, standards lists). Row hover, sortable-column affordance, sticky header on scroll. |
| **Progress bar / ring** | determinate, indeterminate | Ring form used for mastery-percentage display (doc 04); bar form for practice-set completion. |
| **Skeleton** | — | Content-shaped loading placeholder (doc 05) — matches the exact shape of the content it's replacing, never a generic gray box. |
| **Spinner** | — | Reserved for short, indeterminate actions only (doc 05 draws the exact usage line against Skeleton). |
| **Divider** | — | `ink-200`, 1px. |

### 7.3 Pattern components (MentorOS-specific composition)

| Pattern | Composed from | Notes |
|---|---|---|
| **MessageBubble** | Card + Avatar + Badge | Three visual variants: student (right-aligned, `brand-indigo-500` fill), assistant (left-aligned, `ink-050` fill), safety-decline (left-aligned, `safety` family — visually distinct from a normal assistant reply, per doc 01 Principle 1.4). Renders Markdown/LaTeX (Phase 2 chat upgrade), not plain text. |
| **AgentTraceNode** | Badge + Card | One node in the AI Transparency pipeline visualization (doc 04) — shows agent name (Geist Mono), a status icon, and latency (Geist Mono). |
| **EvaluationScoreCard** | Card + Progress ring | Shows Evaluation Agent's per-dimension scores. |
| **StatTile** | Card | Dashboard metric display — label (`caption`), value (`heading-lg` or `mono-md` if numeric/technical), optional trend indicator. |
| **PracticeQuestionCard** | Card + Input/Radio | Structured rendering of Practice Agent output — replaces today's flattened plain-text reply. |
| **AssessmentFeedbackCard** | Card + Badge + Progress ring | Structured rendering of Assessment Agent output (mastery score, status, misconceptions). |
| **RoadmapPath** | Badge + Progress ring, connected by a line | Learning Roadmap's chapter → concept sequence (doc 02) — one node per concept, `done`/`current`/`next` status per `08_Component_Ownership.md`'s proposed addition, formally added here per that document's own instruction before Sprint 9 (Epic F3) implementation. |
| **EmptyState** | — | See doc 05. |
| **LoadingState** | Skeleton/Spinner | See doc 05. |
| **ErrorState** | Card + Button | See doc 05. |

### 7.4 Elevation
MentorOS uses **borders, not shadows, as the primary surface-separation mechanism** in light mode (a considered choice — shadows read as heavier/more "app-like" than this brand's restrained positioning wants). One shadow token exists for the few contexts that need to visually float above content: `elevation-overlay` (used only by Modal and Toast) — `0 8px 24px rgba(20, 19, 43, 0.16)`. Everything else (Card, StatTile, etc.) uses a 1px `ink-200` border only.

---

## 8. Icons

### 8.1 Sourcing decision
**Recommend adopting [Lucide](https://lucide.dev)** (MIT-licensed, stroke-based, actively maintained, pairs naturally with Geist's geometric character) rather than commissioning a custom icon set for Phase 1A. A bespoke MentorOS icon set is a real, separate investment better justified once the product surface (Phase 2's later phases) is large enough to need icons Lucide doesn't cover — flagged as a future item, not in scope now. This is a tooling recommendation requiring the same sign-off as any new dependency (doc 06).

### 8.2 Usage rules
- **Stroke width:** 1.5px at all sizes (Lucide's default) — never mixed with a filled icon style in the same view.
- **Size grid:** 16px (inline with `body-sm`/`caption` text), 20px (inline with `body-md`, default UI density), 24px (standalone/button icons). No other sizes.
- **Color:** icons inherit `currentColor` by default — they take the color of their surrounding text/button context, never hardcoded independently, so they stay correct across light/dark mode and semantic-color contexts automatically.
- **Labeling:** every icon used as an interactive control (not purely decorative) has an accompanying `aria-label` or adjacent visible text label (Accessibility §16) — no icon-only buttons without one.
- **MentorOS-specific icon needs not in Lucide's default set** (e.g. a distinct Safety-shield glyph, an Agent-pipeline-node glyph): compose from Lucide primitives first (e.g. `shield-check` for Safety) before considering a custom glyph — keeps the system consistent and avoids a mixed-style icon set creeping in one icon at a time.
