# MentorOS Design System — Overview

**Phase:** 2, Phase 1A — Create the complete MentorOS Design System
**Lifecycle stage:** Architecture Design → UX Design → Technical Design → Implementation Plan → **awaiting Approval**
**Status:** Documents only. No source code, no React, no assets have been created or modified.

---

## Why this exists

MentorOS's engineering (M0–M9) shipped without a design system: four pages and three components, all inline-styled, system fonts, no brand identity, homepage reading "Coming soon." Phase 1A's job is to define the complete design language MentorOS will build on for the rest of Phase 2 — before any of Phase 2's later phases (AI Transparency, Student Experience, Teacher Studio, Multimodal) write a single component, so nothing gets built twice or built inconsistently.

This is documentation only, per the Phase 1A brief. Nothing in `web/src/` has been touched. Implementation begins only after this system is approved and Phase 1's own Implementation Plan stage is separately written and approved, per the stated lifecycle.

---

## Grounding

This design system is not invented in a vacuum — every principle below is traceable to an existing MentorOS document:

- **Design Principles** (doc 01) translate `00_Product_Principles.md`'s product principles (Learning before answering, Conceptual clarity, Trustworthiness, Mistakes are valuable) into visual and interaction rules — not new principles, the same ones already governing every agent's system prompt, now applied to pixels.
- **Student vs. Teacher Experience** (doc 04) reflects the persona split `03_User_Personas.md` already defines, and the "teacher-facing, not student-runtime" boundary the Phase 2 roadmap already drew for Learning Commons.
- **Chat Experience** (doc 04) and **AI Transparency's** visual needs (agent pipeline, Evaluation scores, Safety gate, cost/latency) are designed here so Phase 2's second phase has a system ready to build against, not a blank page.
- **Accessibility Guidelines** (doc 02) target WCAG 2.1 AA as a floor, not an aspiration, given the platform serves children and will be evaluated by institutional (school/district) buyers who typically require it as a hard procurement criterion.

---

## Document map

| # | Deliverable (from Phase 1A brief) | Document |
|---|---|---|
| 1 | Design Principles | [01-Architecture-Design.md](01-Architecture-Design.md) |
| 2 | Brand Identity | [01-Architecture-Design.md](01-Architecture-Design.md) |
| 3 | Color Palette | [02-Technical-Design-Foundations.md](02-Technical-Design-Foundations.md) |
| 4 | Typography | [02-Technical-Design-Foundations.md](02-Technical-Design-Foundations.md) |
| 5 | Spacing System | [02-Technical-Design-Foundations.md](02-Technical-Design-Foundations.md) |
| 6 | Grid System | [02-Technical-Design-Foundations.md](02-Technical-Design-Foundations.md) |
| 7 | Component Library | [03-Component-Library.md](03-Component-Library.md) |
| 8 | Icons | [03-Component-Library.md](03-Component-Library.md) |
| 9 | Navigation | [04-UX-Design-Experiences.md](04-UX-Design-Experiences.md) |
| 10 | Layout Rules | [04-UX-Design-Experiences.md](04-UX-Design-Experiences.md) |
| 11 | Student Experience | [04-UX-Design-Experiences.md](04-UX-Design-Experiences.md) |
| 12 | Teacher Experience | [04-UX-Design-Experiences.md](04-UX-Design-Experiences.md) |
| 13 | Chat Experience | [04-UX-Design-Experiences.md](04-UX-Design-Experiences.md) |
| 14 | Dashboard Layouts | [04-UX-Design-Experiences.md](04-UX-Design-Experiences.md) |
| 15 | Responsive Guidelines | [02-Technical-Design-Foundations.md](02-Technical-Design-Foundations.md) |
| 16 | Accessibility Guidelines | [02-Technical-Design-Foundations.md](02-Technical-Design-Foundations.md) |
| 17 | Animation Principles | [05-Motion-And-States.md](05-Motion-And-States.md) |
| 18 | Empty States | [05-Motion-And-States.md](05-Motion-And-States.md) |
| 19 | Loading States | [05-Motion-And-States.md](05-Motion-And-States.md) |
| 20 | Error States | [05-Motion-And-States.md](05-Motion-And-States.md) |
| — | Folder structure & implementation recommendations | [06-Implementation-Plan.md](06-Implementation-Plan.md) |

---

## One-paragraph summary of the system

MentorOS reads as **credible infrastructure with a warm teaching layer** — not a cartoon kids' app, not a cold enterprise console. A deep indigo (`brand-indigo`) carries trust and focus across every surface; a warm amber (`accent-amber`) is spent sparingly, only on genuine encouragement and achievement moments, so it stays meaningful. Two typefaces carry two registers on purpose: **Fraunces**, a characterful serif, appears only at moments of warmth or celebration (headlines, "nice work" moments); **Geist Sans/Mono** — already in the codebase, unused — carries everything structural, professional, and data-dense (UI chrome, Teacher Studio, agent-transparency panels, cost/latency figures). Student surfaces stay minimal-chrome and forgiving; Teacher Studio is allowed to be denser and more data-forward, matching how a working teacher actually uses a tool. Nothing here is decorative by default — color, motion, and type each carry meaning, in direct service of `00_Product_Principles.md`'s own rules.

See doc 01 for the full reasoning behind these choices.
