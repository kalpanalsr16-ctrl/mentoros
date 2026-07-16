# Technical Design — Foundations

Lifecycle stage 3 of 4 (Technical Design). Covers: Color Palette, Typography, Spacing System, Grid System, Responsive Guidelines, Accessibility Guidelines. All values below are token definitions — none of this is implemented in code yet (see doc 06 for how these become CSS custom properties/a token file).

---

## 3. Color Palette

### 3.1 Principle
One brand hue (indigo — trust, focus) carries the system. One accent hue (amber — encouragement) is spent only on genuine achievement/celebration moments, never as decoration, so it stays meaningful (Design Principle 1.5). Semantic colors are hue-distinct from both, including a dedicated **safety** hue — a Safety Agent decline is a protective boundary, not an error, and must never look like one (Design Principle 1.4).

### 3.2 Brand — Indigo

| Token | Hex | Use |
|---|---|---|
| `brand-indigo-900` | `#211D5C` | Highest-emphasis text on light surfaces, dark-mode brand surface |
| `brand-indigo-700` | `#423E99` | Primary interactive (buttons, links) hover/active |
| `brand-indigo-500` | `#5750B8` | Default primary interactive color, wordmark "OS" |
| `brand-indigo-300` | `#8B85D6` | Secondary surfaces, focus rings on dark backgrounds |
| `brand-indigo-100` | `#E8E6F7` | Subtle background tint (selected states, info surfaces) |

### 3.3 Accent — Amber (encouragement/achievement only)

| Token | Hex | Use |
|---|---|---|
| `accent-amber-700` | `#A8641A` | Achievement text on light surfaces |
| `accent-amber-500` | `#D9971F` | Streak/achievement badges, celebratory highlights |
| `accent-amber-300` | `#F0C878` | Celebratory background tint |
| `accent-amber-100` | `#FBF0DC` | Achievement card background |

**Rule:** if amber appears more than once per screen outside the Student Experience's achievement surfaces (doc 04), that's a design-review flag, not a stylistic choice — it dilutes the one hue reserved for genuine praise.

### 3.4 Neutrals — Ink (cool violet undertone, not pure gray)

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#14132B` | Primary text (light mode), page background (dark mode) |
| `ink-800` | `#2B2A4A` | Secondary text (light mode) |
| `ink-600` | `#4E4C72` | Tertiary/meta text, disabled text |
| `ink-400` | `#8987A8` | Placeholder text, borders (emphasis) |
| `ink-300` | `#B3B1CB` | Borders (default) |
| `ink-200` | `#D7D6E6` | Dividers, subtle borders |
| `ink-100` | `#EDECF5` | Secondary surface background (light mode) |
| `ink-050` | `#F7F6FB` | Page background (light mode) |
| `ink-000` | `#FFFFFF` | Card/surface background (light mode), primary text (dark mode) |

### 3.5 Semantic

| Token | Hex (600 / 100) | Use |
|---|---|---|
| `success` | `#2F8F5B` / `#E1F5EA` | Correct answers, completed states, positive confirmations |
| `warning` | `#C15A1E` / `#FBE4D3` | Caution, rate-limit notices, non-blocking issues |
| `danger` | `#A83A2F` / `#FAE1DE` | True failures (network error, save failed) — brick red, deliberately not alarm-red. *(Amended during Sprint 1 implementation: the originally-proposed `#C4483C` measured 3.89:1 against `danger-100`, below the AA floor §16 commits to — caught by `web/tests/contrast.test.ts`, not by design review.)* |
| `info` | `#3B7FC4` / `#DDEBFA` | Neutral informational messaging |
| `safety` | `#4A6580` / `#E4EBF0` | **Dedicated to Safety Agent gate states only.** A calm slate-blue, visually distinct from `danger` on purpose — a safety decline is never styled as if the student did something wrong. |

**Incorrect-answer distinction:** a wrong practice/assessment answer uses `warning`, never `danger` — `danger` is reserved for MentorOS's own failures (a save that didn't work, a network error), never the student's. This is a direct application of Design Principle 1.4.

### 3.6 Dark mode rule
Every token above has a dark-mode counterpart derived by the same rule: invert the `ink` scale (950↔000), and lighten/desaturate `brand`, `accent`, and semantic hues just enough to hold WCAG AA contrast against `ink-950` backgrounds — never reuse the identical light-mode hex on a dark surface. Worked example: `brand-indigo-500` (`#5750B8`, 4.6:1 on `ink-000`) becomes `brand-indigo-300` (`#8B85D6`) as the default interactive color on dark surfaces, since `#5750B8` alone would fail contrast against `ink-950`. Full dark-mode token table is an Implementation Plan (doc 06) deliverable once this palette is approved — deriving all ~25 dark variants by hand here would be premature before the light-mode palette itself is signed off.

---

## 4. Typography

### 4.1 Two typefaces, two registers (see doc 01 §2.1 for the reasoning)

| Role | Typeface | Status |
|---|---|---|
| Display / celebratory | **Fraunces** (variable, optical sizing) | New — not yet in the codebase. Self-hostable via `next/font/google`, same mechanism already used for Geist. |
| UI / body / data | **Geist Sans** + **Geist Mono** | Already integrated (`layout.tsx`) but almost entirely unused today — this system finally puts them to work. |

Fraunces appears *only* at: landing/marketing headlines, celebratory in-app moments ("Nice work on Addition!"), and Teacher Studio report headline title. Everywhere else — including all of chat, all of Teacher Studio's working UI, every button and label — is Geist Sans. Geist Mono is reserved for genuinely technical/tabular content: trace IDs, agent names in the transparency panel, cost/token/latency figures, Learning Commons standard codes (e.g. `4.OA.A.3`), timestamps.

### 4.2 Type scale

| Token | Size / line-height | Typeface / weight | Use |
|---|---|---|---|
| `display-2xl` | 3rem / 1.1 | Fraunces, 500 | Landing hero |
| `display-xl` | 2.25rem / 1.15 | Fraunces, 500 | Section headers, major celebration |
| `display-lg` | 1.75rem / 1.2 | Fraunces, 500 | Card-level celebration ("Level up!") |
| `heading-lg` | 1.5rem / 1.3 | Geist Sans, 600 | Page titles |
| `heading-md` | 1.25rem / 1.35 | Geist Sans, 600 | Section titles |
| `heading-sm` | 1.0625rem / 1.4 | Geist Sans, 600 | Card titles |
| `body-lg` | 1.125rem / 1.6 | Geist Sans, 400 | Chat message text (deliberately larger than default UI text for reading comfort) |
| `body-md` | 1rem / 1.6 | Geist Sans, 400 | Default UI text |
| `body-sm` | 0.875rem / 1.5 | Geist Sans, 400 | Secondary/meta text |
| `caption` | 0.75rem / 1.4 | Geist Sans, 500 | Labels, timestamps |
| `mono-md` | 0.875rem / 1.5 | Geist Mono, 400 | Data/technical inline |
| `mono-sm` | 0.75rem / 1.4 | Geist Mono, 400 | Trace IDs, fine-grained data |

### 4.3 Rules
- Never more than one `display-*` size per screen.
- Body text never drops below `body-sm` (0.875rem) for anything a student reads; `caption`/`mono-sm` are for meta/technical content only, and per Accessibility Guidelines (§6) must still hold 4.5:1 contrast.
- Fraunces is loaded with only the weights actually used (400/500) to keep the added font-loading cost minimal — a specific implementation constraint, not just a style note.

---

## 5. Spacing System

4px base unit, applied consistently across margin, padding, and gap — no arbitrary pixel values anywhere in implementation (doc 06 enforces this via lint rule recommendation).

| Token | rem / px |
|---|---|
| `space-0` | 0 |
| `space-1` | 0.25rem / 4px |
| `space-2` | 0.5rem / 8px |
| `space-3` | 0.75rem / 12px |
| `space-4` | 1rem / 16px |
| `space-5` | 1.25rem / 20px |
| `space-6` | 1.5rem / 24px |
| `space-8` | 2rem / 32px |
| `space-10` | 2.5rem / 40px |
| `space-12` | 3rem / 48px |
| `space-16` | 4rem / 64px |
| `space-20` | 5rem / 80px |
| `space-24` | 6rem / 96px |

**Corner radii** (spacing-adjacent, defined here for the same token system):

| Token | px | Use |
|---|---|---|
| `radius-sm` | 6px | Inputs, chips |
| `radius-md` | 10px | Buttons, cards |
| `radius-lg` | 16px | Modals, message bubbles |
| `radius-full` | 9999px | Avatars, pills, badges |

---

## 6. Grid System

12-column responsive grid.

| Breakpoint | Container max-width | Columns | Gutter | Margin |
|---|---|---|---|---|
| `xs` (0–479px) | fluid | 4 | 16px | 16px |
| `sm` (480–767px) | fluid | 8 | 16px | 24px |
| `md` (768–1023px) | 720px | 12 | 24px | 32px |
| `lg` (1024–1279px) | 960px | 12 | 24px | 40px |
| `xl` (1280px+) | 1200px | 12 | 24px | 64px |

MentorOS is not a wide-dashboard product by default — 1200px is the deliberate cap even at large viewports (Teacher Studio's denser tables, doc 04, are the one context permitted to use the full container width; chat and student surfaces should generally use a narrower reading-width column within this grid, not the full 12).

---

## 15. Responsive Guidelines

- **Mobile-first.** Every component is designed at `xs` first, then enhanced upward — not designed at desktop and crammed down.
- **Touch targets:** minimum 44×44px on any interactive element for Student Experience surfaces (matches WCAG 2.1 AA + accounts for younger learners' motor precision); 40×40px minimum acceptable for Teacher Studio's denser data-table contexts, per Nielsen Norman / platform-standard density norms for professional tools.
- **Navigation collapse:** Teacher Studio's sidebar nav (doc 04) collapses to a bottom tab bar below `md`; Student Experience's minimal top bar never changes shape across breakpoints, it just shrinks padding.
- **Chat column width:** caps at 720px (roughly `md`'s container) even on wide desktop viewports — matches `body-lg`'s reading-comfort intent from §4.
- **Dashboards** (doc 04): stat-tile grids reflow from 4-across (`xl`) → 2-across (`md`/`lg`) → 1-across (`xs`/`sm`), never horizontally scroll on mobile.

---

## 16. Accessibility Guidelines

**Target: WCAG 2.1 AA, treated as a floor, not a stretch goal** — both because MentorOS serves children directly and because institutional (school/district) buyers on the showcase list typically require AA compliance as a procurement gate.

- **Contrast:** every text/background token pairing in §3 must resolve to ≥4.5:1 for body text, ≥3:1 for large text (`heading-lg`+/`display-*`) and UI component boundaries. This is a testable acceptance criterion for Phase 1's Implementation stage, not just a guideline — doc 06 recommends an automated contrast check in CI.
- **Focus visibility:** every interactive element has a visible focus state using `brand-indigo-500` (light mode) / `brand-indigo-300` (dark mode) as a 2px outline with 2px offset — never `outline: none` without a replacement, anywhere in the system.
- **Keyboard navigation:** full task completion (send a message, navigate Teacher Studio, dismiss a modal) must be possible with keyboard alone. Modal/dialog components trap focus and restore it on close (component-level requirement, doc 03).
- **Screen readers / ARIA:**
  - Chat message stream uses `aria-live="polite"` for incoming assistant messages (not `assertive` — a student mid-typing shouldn't be interrupted).
  - Streaming text updates (Phase 2's streaming chat) announce completion once, not on every token — a live region strategy, not per-character announcements.
  - Safety decline messages get the same `aria-live="polite"` treatment as any other assistant message — no special "alert" styling that would read as more alarming than the calm visual treatment in §3.5 intends.
  - Icons (doc 03) are always paired with a text label or `aria-label`; no icon-only interactive element without one.
- **Reduced motion:** every animation defined in doc 05 has a `prefers-reduced-motion` fallback (instant state change, no transition) — not an optional nice-to-have, a required pairing for every motion token.
- **Text resizing:** layout must not break at 200% browser text zoom — rem-based type scale (§4) and no fixed-height text containers is the mechanism.
- **Color is never the only signal:** correct/incorrect, safety-blocked, and status states (doc 05) always pair color with an icon or text label — never color alone (relevant given `success`/`warning`/`danger`/`safety` are close in lightness for some users with color vision deficiency).
