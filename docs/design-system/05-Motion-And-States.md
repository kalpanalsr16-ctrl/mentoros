# UX Design — Motion & Interaction States

Lifecycle stage 2 of 4 (UX Design), continued. Covers: Animation Principles, Empty States, Loading States, Error States.

---

## 17. Animation Principles

### 17.1 Principle: purposeful, never decorative
Every motion in the system exists to communicate a state change, guide attention, or provide feedback — never as ambient decoration. This is a direct extension of Design Principle 1.5 (never rush the student): motion that exists only to feel lively actively works against the calm, unhurried register this product needs.

### 17.2 Motion tokens

| Token | Duration | Use |
|---|---|---|
| `duration-instant` | 100ms | Hover/focus state changes |
| `duration-fast` | 150ms | Button press, toggle |
| `duration-base` | 220ms | Card/panel enter-exit, modal |
| `duration-slow` | 360ms | Page-level transitions |
| `duration-celebratory` | 600ms | Achievement/streak moments only — the one place a longer, more expressive animation is warranted |

| Token | Curve | Use |
|---|---|---|
| `easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default for most transitions |
| `easing-decelerate` | `cubic-bezier(0, 0, 0, 1)` | Elements entering the screen |
| `easing-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | Elements leaving the screen |

### 17.3 Named moments that get motion
- **Message arrival** — new chat message fades/slides in (`duration-base`, `easing-decelerate`) — the one chat-native motion, since it mirrors how a conversation actually feels.
- **Streaming cursor** — a subtle blinking caret during token streaming (Phase 2), not a spinner — communicates "still generating" without implying indeterminate delay.
- **Achievement unlock** — the one place `duration-celebratory` and the `accent-amber` palette (doc 02 §3.3) combine — a badge scales in with a slight overshoot, per Design Principle 1.5's "reward consistency, not urgency," this is deliberately warm, not flashy or prize-wheel-like.
- **Panel expand/collapse** (AI Transparency panel, §13.2 in doc 04) — height/opacity transition, `duration-base`.
- **Page transitions** — `duration-slow`, simple cross-fade only, no directional slide (avoids implying a spatial navigation model the app doesn't have).

### 17.4 Named moments that explicitly do NOT get motion
- Teacher Studio data tables — sorting/filtering is instant, no animated reflow (professional-tool density expectation, motion would read as sluggish).
- Any element in the direct chat-send path — sending a message must never feel artificially slowed by decorative animation on top of real network latency.
- Error states (§20) — appear immediately, no fade-in that delays the student noticing what happened.

### 17.5 Reduced motion
Every token/moment above has a `prefers-reduced-motion: reduce` fallback of an instant state change (0ms, no transition) — this is a hard requirement (doc 02 §16), not a partial degradation (e.g., no "shorter but still animated" compromise).

---

## 18. Empty States

Per Design Principle 1.2, an empty state is still "one idea" — it should tell the user what will appear here and, where possible, offer the one action that fills it. Never a bare "No data" message.

| Context | Copy | Action |
|---|---|---|
| New chat, no messages | "Ask a question to get started." *(existing copy — kept, it already matches this system's voice)* | — |
| Student progress view, no mastery data yet | "Your progress will show up here after your first few questions." | none (informational) |
| Teacher class roster, no students linked | "No students in this class yet. Share your class code to get started." | "Copy class code" button |
| Curriculum Explorer, no search results | "No matches for '{query}'. Try a broader term or check spelling." | Clear search |
| Evaluation Platform report, no data for period | "No interactions recorded in this period yet." | Change date range |

Visual pattern: centered within the content region, `body-md` copy in `ink-600`, optional single action button below — no illustration/mascot (per doc 01 §2.4's non-goals).

---

## 19. Loading States

### 19.1 Skeleton vs. Spinner — the exact usage line
- **Skeleton**: any content-shaped region with a known layout about to be filled (dashboard stat tiles, message list on initial chat load, Curriculum Explorer results). Matches the real content's exact shape/proportions — never a generic gray rectangle.
- **Spinner**: short, indeterminate actions with no predictable shape (button loading state, "Sending...", form submission). Never used for a full-page load — that's a Skeleton's job.

### 19.2 Streaming-specific loading (Phase 2)
Once chat streams (doc 04 §13), the "loading state" for a reply is the streaming text itself plus the blinking-caret motion (§17.3) — there is no separate spinner-then-content handoff. This replaces today's "Sending..." button-disabled pattern for the reply itself, though the send button still shows its own brief `duration-fast` disabled state to prevent double-submission.

### 19.3 Rule
No loading state may appear for less than ~150ms even if the response is instant (prevents a jarring flash) — but nothing should be artificially delayed to "show" a loading state longer than the real wait, which would contradict Design Principle 1.5.

---

## 20. Error States

Direct application of Design Principle 1.4 (mistakes are valuable, never punitive) extended to MentorOS's *own* failures, not the student's.

### 20.1 Copy rules
- Name what happened, plainly: "Your message couldn't be sent" — not "Error 500" or "Something went wrong" alone.
- Always pair with what to do next: "Please try again" or a specific retry action — never leave the student stuck with no path forward.
- Never imply the student caused it, unless they genuinely did (e.g. a validation error on a form field, which uses `warning`, not `danger` — see doc 02 §3.5).
- No apologetic hedging beyond one plain acknowledgment — "Sorry, that didn't work" once, not repeated across a screen.

### 20.2 Reference examples

| Context | Copy | Visual |
|---|---|---|
| `/api/chat` request fails | "I'm having trouble responding right now. Please try sending your message again in a moment." *(existing M1 copy — kept, already matches this system)* | Inline in message stream, `danger` accent on retry affordance only, not the whole bubble |
| Rate limited | "You're sending messages too quickly. Please wait a moment and try again." *(existing copy — kept)* | `warning`, not `danger` — this isn't a failure, it's a boundary |
| Network/save failure (Teacher Studio form) | "Your changes couldn't be saved. Check your connection and try again." | Inline banner above the form, `danger`, persists until resolved or dismissed |
| Learning Commons provider unreachable (Phase 4/6) | "Learning Commons data isn't available right now — showing MentorOS's own curriculum only." | `warning` banner, graceful degradation shown explicitly rather than silently — matches Design Principle 1.3 |

### 20.3 What is explicitly NOT an error state
Safety Agent declines (doc 04 §13.3) and incorrect practice answers (`warning`, not `danger`, doc 02 §3.5) are never styled or copy-written as errors — this distinction is load-bearing throughout the system, not a one-off note.
