# Implementation Plan — Design System

Lifecycle stage 4 of 4 (Implementation Plan), for Phase 1A specifically. This document proposes *how* docs 01–05 become code — folder structure, tooling decisions, and build sequencing — without writing any of that code. Per the Phase 1A brief, implementation itself waits for separate approval.

---

## Tooling decisions requiring sign-off

Two real, new-dependency decisions are embedded in docs 02–03 and restated here explicitly, since they're the kind of choice that should be a conscious yes, not an implied one:

1. **Styling approach: CSS Modules + CSS custom-property tokens**, not Tailwind or a component library (MUI, Chakra, etc.). Recommended because it's the lowest-risk extension of what's already there (`globals.css` already uses CSS custom properties for `--background`/`--foreground`) and keeps MentorOS's dependency footprint minimal, consistent with the project's posture through M0–M9 (zero UI framework dependencies to date).
2. **New font dependency: Fraunces**, loaded via `next/font/google` exactly like Geist already is (doc 02 §4.1) — zero new infrastructure, just one more `next/font` call, weights 400/500 only.
3. **New icon dependency: Lucide** (doc 03 §8.1), MIT-licensed, tree-shakeable (only imported icons ship in the bundle).

None of these are implemented yet. Flagging them here so Phase 1's actual Implementation Plan (the next lifecycle pass, once this design system is approved) doesn't silently decide them without your visibility.

---

## Proposed folder structure

A new top-level directory, **separate from `web/src/components/`** (which today holds only the three feature-specific chat components) — the design system is reusable infrastructure, feature components consume it, and keeping them apart prevents the two concerns from tangling as the product grows:

```
web/src/design-system/
├── tokens/
│   ├── colors.ts          # doc 02 §3 — brand, accent, ink, semantic, safety
│   ├── typography.ts      # doc 02 §4 — type scale, font family refs
│   ├── spacing.ts         # doc 02 §5 — space-* and radius-* scale
│   ├── motion.ts          # doc 05 §17 — duration/easing tokens
│   ├── breakpoints.ts     # doc 02 §6/§15 — grid + responsive breakpoints
│   └── index.ts           # re-exports all of the above
│
├── primitives/             # doc 03 §7.2 — one folder per component
│   ├── Button/
│   ├── Input/
│   ├── Textarea/
│   ├── Select/
│   ├── Checkbox/
│   ├── Radio/
│   ├── Badge/
│   ├── Avatar/
│   ├── Card/
│   ├── Modal/
│   ├── Tooltip/
│   ├── Toast/
│   ├── Tabs/
│   ├── Table/
│   ├── ProgressRing/
│   ├── ProgressBar/
│   ├── Skeleton/
│   ├── Spinner/
│   └── Divider/
│
├── patterns/                # doc 03 §7.3 — MentorOS-specific composition
│   ├── MessageBubble/
│   ├── AgentTraceNode/
│   ├── EvaluationScoreCard/
│   ├── StatTile/
│   ├── PracticeQuestionCard/
│   ├── AssessmentFeedbackCard/
│   ├── EmptyState/
│   ├── LoadingState/
│   └── ErrorState/
│
├── icons/
│   └── index.ts            # thin re-export wrapper around Lucide (doc 03 §8) —
│                            # keeps a single swap point if the icon set ever changes
│
└── README.md                # points back to docs/design-system/, not a duplicate
```

Each primitive/pattern folder follows the same internal shape (once Implementation begins): `ComponentName.tsx`, `ComponentName.module.css`, `index.ts`. Established here as a convention, not built yet.

**Existing `web/src/components/chat/*` migration** is explicitly a *later* Phase 1 task (rebuilding `ChatShell`/`MessageList`/`MessageInput` on top of `design-system/patterns/MessageBubble` etc.) — not part of Phase 1A, and not proposed to happen automatically. This document only establishes where the new system lives; migrating existing components onto it is its own scoped, approved step.

---

## Build sequencing within Phase 1 (once Phase 1A is approved)

Recommended order for the *next* lifecycle pass (Phase 1's own Architecture→UX→Technical→Implementation Plan→Approval cycle), sequenced so nothing is built before its dependency exists:

1. **Tokens** (`tokens/`) — pure data, no visual output, everything else depends on this.
2. **Primitives with no internal composition** — Button, Input, Badge, Avatar, Card, Divider, Spinner, Skeleton (doc 03 §7.2's simplest rows).
3. **Primitives that compose other primitives** — Modal, Tooltip, Toast, Tabs, Table (depend on Card/Button existing first).
4. **Patterns** (doc 03 §7.3) — each depends on specific primitives from steps 2–3; build in the order Phase 2's roadmap actually needs them (MessageBubble first, since Phase 1's own "chat experience upgrade" needs it immediately; AgentTraceNode/EvaluationScoreCard next, since Phase 2 AI Transparency needs them right after).
5. **Page-level migration** — homepage, then chat, last (highest-risk surface, benefits from every primitive/pattern above already being proven elsewhere first).

---

## Testing & documentation recommendations

- **Visual/interaction testing:** recommend a lightweight Storybook (or equivalent) setup as part of Phase 1's Implementation stage — not required for Phase 1A's documentation-only scope, but flagged now since it's much cheaper to introduce before 25+ components exist than after.
- **Contrast testing:** doc 02 §16's AA requirement should have an automated check (e.g. a small script asserting every documented token pairing meets its contrast ratio) — natural fit for the Phase 1.5 "Repository Hardening" work already agreed in the Phase 2 roadmap's CI phase.
- **Documentation:** this `docs/design-system/` directory *is* the documentation — component-level API docs (props, variants) get added as each component is actually implemented, living alongside the code per the folder structure above, not duplicated back into these strategy documents.

---

## What this document is not

Not a component API spec (props/types) — that's written at implementation time, against real React/TypeScript, once this system is approved. Not a final visual design (no Figma-equivalent mockups) — the ASCII wireframes in doc 04 communicate structure and hierarchy, which is what a Staff-level design/engineering pass can responsibly produce before implementation; pixel-level visual polish is refined during actual component-building, against real rendered output, not guessed at on paper first.
