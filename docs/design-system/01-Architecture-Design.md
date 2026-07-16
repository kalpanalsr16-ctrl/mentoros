# Architecture Design — Design Principles & Brand Identity

Lifecycle stage 1 of 4. This document is the strategic foundation everything else (UX Design, Technical Design, Implementation Plan) is derived from.

---

## 1. Design Principles

Each principle below is a direct translation of an existing entry in `00_Product_Principles.md` — the same rules already governing every agent's system prompt — into a rule a designer or engineer can apply to a screen. None of these are new product decisions; they're the existing ones, made visual.

### 1.1 Guide before you reveal
*From: "Learning before answering" (Principle 1).*
The UI never makes a final answer the most visually prominent element on screen. Hints, guiding questions, and step-by-step scaffolding get primary visual weight; a revealed answer, when it appears, is visually quieter (smaller, or requires a deliberate action to expand) than the reasoning that led to it. Applies to Concept, Practice, and Assessment surfaces alike.

### 1.2 One idea at a time
*From: "Conceptual clarity" (Principle 2).*
Every screen region does one job. No card, panel, or message tries to teach a concept and show a metric and prompt an action simultaneously. Generous whitespace and a strict content hierarchy (see Grid System, doc 02) are the mechanism, not a stylistic preference.

### 1.3 Show your work
*From: "Trustworthiness" (Principle 4).*
Every place MentorOS could be a black box, it isn't: Safety Agent's gate decision, Evaluation Agent's score, and Memory Agent's profile update are all first-class, visible UI states (see AI Transparency needs in doc 04's Chat Experience section), not debug output. If MentorOS doesn't know something, the UI has a designed way to say so plainly — never a vague or evasive state.

### 1.4 Wrong answers are progress, not failure
*From: "Mistakes are valuable" (Principle 7).*
Error and incorrect-answer states are never styled with alarm-red, shame language, or punitive iconography (no red X stamped over work, no harsh buzzer-style motion). See the dedicated `danger` vs `warning` vs incorrect-answer token distinction in doc 02, and the Error States document (05) for exact copy rules.

### 1.5 Never rush the student
*From: "MentorOS does not optimize for the fastest possible answer" (Non-Principle).*
No countdown timers, no urgency-coded motion (pulsing, shaking) on the default teaching path, no gamified pressure mechanics on the core learning loop. Achievements and streaks (doc 04, Student Experience) reward consistency over time, never speed within a session.

### 1.6 Two audiences, one system
Not derived from a single product principle, but required by `03_User_Personas.md`'s own persona split and the Phase 2 roadmap's explicit teacher/student boundary: the same tokens, type scale, and component primitives serve both a 9-year-old student and a working teacher, but density, pacing, and copy register shift between them (doc 04). One design system, two calibrated experiences — never two different-feeling products.

---

## 2. Brand Identity

### 2.1 Positioning
MentorOS is **credible infrastructure with a warm teaching layer** — the name itself says this ("Mentor" + "OS"). The visual identity should read closer to how a serious platform company (the kind on the showcase list — Anthropic, OpenAI, Microsoft) presents itself than to a children's cartoon app (the Duolingo-owl register). Warmth is real and present, but it's earned through language, color use, and specific celebratory moments — not through a mascot or illustrated character system, which this brand does not have and is not proposing.

### 2.2 Voice & tone
Already established, not invented here — every agent's system prompt across M1–M9 independently arrived at the same voice: **friendly, encouraging, conversational, calm.** Formalized as a written brand voice for everything outside the chat (marketing copy, UI microcopy, error messages, teacher-facing copy):

| Do | Don't |
|---|---|
| Plain, specific language ("Nice work — you got 4 of 5 right.") | Vague praise ("Great job!!" with no specifics) |
| Calm, even in error states | Exclamation-heavy, hype-driven copy |
| Active voice, names what happens ("Sending your answer...") | Passive/system-speak ("Your request is being processed") |
| Second person, direct ("You're ready for the next topic.") | Third person about the student ("The learner has completed...") — reserved for teacher-facing aggregate views only, where it's appropriate |
| Honest about uncertainty ("I'm not fully sure — here's my best explanation.") | Confident-sounding hedges that overstate certainty |

Teacher-facing copy shifts register slightly — more information-dense, professional, still plain — never becomes cold or jargon-heavy. See doc 04 §Teacher Experience.

### 2.3 Wordmark
"MentorOS" set in **Geist Sans, weight 600 (Semibold)**, all one word, sentence case as written (not all-caps, not stylized). No icon-glyph lockup is proposed for Phase 1A — a text-only wordmark is the right scope for this phase; a mark/icon is a Phase 1B-or-later decision requiring its own dedicated exploration, not squeezed into the design-system foundation pass.

**Construction rule for the one permitted visual treatment:** "Mentor" in `ink-950` (or `ink-050` on dark surfaces), "OS" in `brand-indigo-500`. This is the only approved wordmark variation — it reinforces the platform/infrastructure positioning (§2.1) without requiring a logomark. No gradients, no drop shadows, no rotation or skew treatments on the wordmark, ever.

### 2.4 What this brand is not
Explicit non-goals, so future work doesn't drift without a conscious decision:
- Not mascot-driven. No character illustration system.
- Not neon/gamified in visual language — achievement and motivation mechanics (doc 04, Student Experience) are real but expressed through color/type/motion restraint, not arcade-style visual noise.
- Not a generic SaaS-blue clone. The indigo/amber pairing (doc 02) and the serif/sans type split (doc 02) are chosen specifically to avoid reading as an interchangeable dashboard product.
- Not styled identically for children and adults — see Design Principle 1.6.
