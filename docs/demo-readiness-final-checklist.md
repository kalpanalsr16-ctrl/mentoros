# MentorOS — Final Demo Readiness Checklist

**Production frozen at commit `f66c9b6`.** No further implementation, refactoring, or deploys before the Amazon interview unless a P0 demo blocker is reproduced live and explicitly approved.

- **Live URL:** https://mentoros-ten.vercel.app
- **CI:** green (typecheck, lint, 203/203 tests, build)
- **Production deploy:** Ready, aliased to the URL above
- **Production smoke test:** 19/19 passed against the live deployment (not a staging environment)

---

## 1. Manual walkthrough — do this once before the interview

I have no browser in this environment, so every item below was verified by reading code or by a scripted API/DB check, never by looking at a rendered page. Anything marked **(unconfirmed)** in the original audit still needs eyes on a real screen. Budget ~10 minutes.

- [ ] `/sign-in`, `/sign-up` — confirm they now look like the rest of the product (brand font, indigo button, no stray grey borders)
- [ ] `/chat` — confirm it shows a loading state instead of a blank frozen screen on first load; send one message
- [ ] `/chat` and `/studio/assistant` — toggle light/dark theme once each; confirm the message input box switches with the rest of the page **(unconfirmed)**
- [ ] `/studio` — click through Classes, Curriculum, Reports, and one deep Studio page (e.g. a Lesson) — confirm the sidebar highlights the correct section, not always "Studio"
- [ ] Click the MentorOS logo from Teacher Studio, Student Dashboard, and Parent Portal — confirm it goes home, not to a "Coming soon." stub
- [ ] `/app/profile` or `/app/settings` — save once, then change a field — confirm "Saved." disappears instead of staying stale
- [ ] `/app/parent-requests` — approve or reject one request — confirm a visible confirmation appears, not just a silent row move
- [ ] `/studio/classes` — create a class, then add/remove a roster student — confirm "Created."/"Added."/"Removed." feedback appears
- [ ] `/studio` — reach Evaluation and Assistant via the new "More tools" row (not just by typed URL)
- [ ] Narrow the browser to a laptop-width window on Class Overview, Student Overview, and Revision — check for any text overflow **(unconfirmed)**
- [ ] Optional: visit a nonsense ID (e.g. `/studio/classes/does-not-exist`) — confirm a styled error page, not Next.js's raw crash screen

If any of these fail on the actual screen, treat it as a reproduced P0/P1 and report back before touching anything.

---

## 2. Fixed and verified — safe to demo on

**P0 (all 7, Batch 1 — commit `ae48c72`)**
| # | Item | Status |
|---|------|--------|
| 1 | Sidebar permanently highlighted "Studio" | Fixed — longest-match + ancestor-exact-match logic |
| 2 | Logo → "Coming soon." stub | Fixed — `homeHref` wired per shell |
| 3 | Sign-in/Sign-up/Chat visual inconsistency | Fixed — tokens + `Button` primitive throughout |
| 4 | No loading state on `/chat`, `/studio/assistant` | Fixed — `loading.tsx` added to both |
| 5 | Stale "Saved." confirmation | Fixed — resets on any field change |
| 6 | Silent parent Approve/Reject | Fixed — visible success state |
| 7 | No global error boundary | Fixed — `app/error.tsx` |

**P1 (6 of 13, Batch 2 — commit `31c5062`)**
| # | Item | Status |
|---|------|--------|
| 1 | Student subpages are navigational dead ends | Fixed — `BackToDashboardLink` |
| 2 | No inbound nav to Evaluation/Assistant | Fixed — "More tools" row |
| 4 | Silent class/roster mutations | Fixed — "Created."/"Added."/"Removed." |
| — | Teacher Assistant swallows fetch errors | Fixed — explicit error state |
| — | Curriculum Explorer visual drift | Fixed — `Button`/`Card` primitives |
| — | Laptop-viewport verification | Done via live check |

**Router Agent correctness fix (commit `f66c9b6`)** — the "45+89" clarification misfire is fixed, unit-tested (30 new tests), and confirmed live in production (19/19). See §4 for the demo-safe prompt.

---

## 3. Known, un-fixed — do not improvise around these live

**P1, deferred (8 items — no code touched):**
- No confirmation dialog before revoking a parent link or removing a roster student (both fire instantly on click)
- `/explorer` and `/onboarding` have no `loading.tsx`
- A failed delete (Assessment/Lesson) shows no error — the spinner just clears
- Inconsistent empty states (Progress page missing a "Go to chat" CTA; parent "Your requests" has no empty state at all)
- Several loading skeletons don't structurally match their real content — expect a visible "pop" on some detail pages
- A few unwrapped flex rows could overflow with a long name at a narrow width **(unconfirmed)**
- No "forgot password" link; sign-up allows a 6-character password but Settings requires 8
- Onboarding's Goals/Style steps allow "Continue" with nothing selected

**P2 — cosmetic, explicitly out of scope**, unchanged: stat-grid breakpoint mismatch, no print stylesheet for Homework's print button, one data type rendered two different ways (Card vs. plain list), literal arrow glyphs instead of icons, a couple of hardcoded values that duplicate an existing token, roster add requires a pasted UUID (documented product decision, not a bug — have any IDs you need ready in advance, don't try to add a student live by name).

**Two open items specific to the Router Agent investigation:**
- The earlier safety-decline misfire (unrelated symptom from the same bug report) is **not** reproduced or fixed — no trace ID was located. If it happens live, don't attempt a live fix; note the exact input and move on.
- Structured replies (Assessment/Practice) complete via a state change straight to "done," with no token-by-token streaming. This is expected, correct behavior — if someone asks "why didn't it stream," that's the answer, not a bug.

---

## 4. Demo-safe prompts

**Recommended** — cleanly demonstrates the Learning/Concept path with no routing ambiguity:
> "I don't understand how to solve 45 + 89 using regrouping. Can you teach me step by step without giving me the answer immediately?"

**Original bug-repro prompt** — now fixed and safe to use, but routes to Assessment (defensible, since "can you answer this" reads as answer-checking, but a less clean story for an audience unfamiliar with the routing nuance):
> "can you answer this addition question 45+89"

Avoid ad-libbing a new prompt on the spot — the Safety Agent's fail-closed behavior on the earlier decline symptom is still unconfirmed, so stick to prompts that have actually been tested.

---

## 5. Route and account

- **URL:** https://mentoros-ten.vercel.app
- **Entry point:** `/chat` (fastest path to the fixed behavior) or `/app` (full student dashboard)
- **Account:** use a pre-existing, already-onboarded student account — avoid live onboarding as the opening beat, since the onboarding zero-selection gap (§3) isn't fixed

---

## 6. Standing rule until after the interview

No implementation, refactoring, or deployment happens from here forward without your explicit approval of a **reproduced** P0. If the manual walkthrough in §1 turns up something new, it gets reported — not fixed — until you say otherwise.
