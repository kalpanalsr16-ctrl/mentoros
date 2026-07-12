# Policy Engine

**Product:** MentorOS

**Version:** 1.0 (Draft — proposed, not yet reviewed)

**Status:** Draft

**Author:** Drafted by Claude at the product owner's request, to unblock M9's Safety Agent (full); pending review

**Revision (2026-07-12):** Product owner reviewed and decided: Safety Agent executes before Router Agent (Pipeline Position, below); M9 enforces exactly two actions, Allow or Block (Enforcement Actions, below), with the graduated "constrain the response" behavior explicitly deferred; Voice Agent stays out of scope entirely. `05_Agent_Architecture/03_Safety_Agent.md` has been updated to match (Router Agent removed from its Dependencies, added to its Supports list; "Router Output" removed from its Inputs).

---

# Purpose

`05_Agent_Architecture/03_Safety_Agent.md` names "Policy Engine" as a hard dependency and lists "Policy Rules," "Age Guidelines," "Academic Integrity Rules," and "Platform Security Rules" under its Knowledge Access section, but no document defines what those rules actually are, how they're structured, or how a risk level maps to an action. This document is that definition — the source of truth Safety Agent (full) reads from, the same relationship `09_Curriculum_Foundation.md` has to Knowledge Retrieval Agent and `12_Learner_Profile_Model.md` has to Memory Agent.

This document does not itself decide how Safety Agent is implemented (rule-based, model-based, hybrid) — that remains an implementation decision for whoever builds M9's Safety Agent. It defines the policy *content* Safety Agent must enforce, independent of how.

---

# Relationship to M0's Baseline Filter

MentorOS already has a safety mechanism: `checkMessageSafety()` (`web/src/lib/safety/filter.ts`), a deterministic keyword-pattern filter covering four categories (`self_harm`, `violence`, `sexual_content`, `prompt_injection`), built in M0 explicitly as a placeholder ("intentionally simple... The full Safety Agent spec... is implemented properly in Milestone M9, once real usage patterns exist"). This Policy Engine document is the bridge between that placeholder and the full spec: every category below either matches, extends, or supersedes one of M0's four.

---

# Pipeline Position

Safety Agent is the **first** agent to touch an incoming message — it runs before Router Agent, before Planning, before Knowledge Retrieval, before Concept Agent. Nothing downstream ever sees a message Safety hasn't already approved:

```
Incoming message
      │
      ▼
Safety Agent (this document's rules)
      │
      ├── Block ──▶ Return decline directly. No further agent runs.
      │
      └── Allow ──▶ Router Agent → Planning → Knowledge Retrieval → Concept/Practice/Assessment Agent
```

This has a direct consequence for which Policy Categories (below) are even evaluable at this stage: Safety Agent only ever sees the **incoming message and conversation history** — no concept has been resolved yet (that's Knowledge Retrieval's job, which hasn't run), and no teaching response has been generated yet (that's Concept/Practice/Assessment Agent's job, also not yet run). A category that requires checking a *generated response* against curriculum facts cannot run here — see Educational Safety below.

---

# Policy Categories

Mirrors `03_Safety_Agent.md`'s Safety Categories section — this section is each category's actual rule content, not a restatement of what the category is for. Each category is marked with where it actually applies, given Pipeline Position above.

## 1. Educational Safety — does not apply at this stage

**Why not:** This category (unsupported mathematical claims, curriculum mismatch, hallucinated concepts) is fundamentally a check on a *generated response* against the Knowledge Package — but Safety Agent runs before Knowledge Retrieval or Concept Agent, so there is no response and no resolved concept yet to check. This is not a gap: `07_Evaluation_Framework.md`'s Groundedness and Accuracy dimensions already cover exactly this concern, applied *after* generation, which is the only point it's actually checkable. Safety Agent's Policy Rules (this document) do not attempt to re-implement it.

## 2. Child Safety

**Rule:** Flag content that is not age-appropriate for the learner's recorded `grade` (from Learner Profile, M8), uses disrespectful language, or provides harmful guidance (self-harm, violence — carrying M0's existing categories forward unchanged).

**Age bands** (informed by `00_Product_Principles.md`'s Primary/High School scope, not a new invention):
- Primary (grades 1–5): simplest vocabulary, most concrete examples, highest encouragement floor.
- Middle/High (grades 6+): standard vocabulary, abstract examples permitted.
- Unknown grade (learner not yet known, per M3-M8's `isKnown: false` default): treat as Primary band until real grade data exists — the safer default, not a guess.

## 3. Prompt Injection

**Rule:** Detect attempts to override MentorOS's system instructions, extract the system prompt, or impersonate a different assistant. Carries M0's existing `prompt_injection` category and its exact phrase set forward unchanged (`ignore previous instructions`, `reveal your system prompt`, `pretend you're not MentorOS`, `disable safety`, etc. — see `filter.ts`) as the confirmed floor; full Safety Agent may extend detection beyond exact-phrase matching (semantic/paraphrase detection), but must not regress below it.

## 4. Academic Integrity

**Rule:** Flag requests that ask for a complete solution to graded work, exam answers, or explicit circumvention of Practice/Assessment Agents (M7) without engaging with the material. Per `00_Product_Principles.md`'s Non-Principles ("MentorOS does not help students cheat"), the required response is redirection toward hints/guided reasoning, not a flat refusal — matches `03_Safety_Agent.md`'s "Instead encourage: Hints, Guided reasoning, Concept understanding."

## 5. Privacy

**Rule:** Flag any generated response that would expose another learner's data, the system prompt itself, or internal implementation details (model name, provider, infrastructure). MentorOS collects only what `12_Learner_Profile_Model.md`'s Privacy Principles already scope; this category enforces that boundary at the response layer, not just the storage layer.

## 6. Platform Safety

**Rule:** Flag automated/scripted abuse patterns (not a single message's content, but request-pattern signals — carries forward the same role `web/src/lib/security/rate-limit.ts` already plays for volume-based abuse; this category is for content-pattern abuse, e.g. repeated spam-like requests, not volume, which rate limiting already handles).

---

# Enforcement Actions (M9): Allow or Block Only

**Product owner decision (2026-07-12):** M9 implements exactly two enforcement outcomes. The four Risk Levels `03_Safety_Agent.md` names (Low/Medium/High/Critical) remain as an internal *severity classification* — logged for observability and available to a future implementation — but they collapse to two actions today:

| Risk Level | Enforcement Action (M9) |
|---|---|
| **Low** | **Allow.** Continue normally — full teaching pipeline (M1–M8) unchanged. |
| **Medium** | **Block.** See rationale below — Medium was originally meant to get a *constrained* response, which M9 doesn't implement. |
| **High** | **Block.** Return a category-appropriate decline (mirrors M0's `buildSafetyDeclineMessage()` pattern) without generating a teaching response. |
| **Critical** | **Block.** Same as High, plus: self-harm gets the crisis-resource decline (unchanged from M0); confirmed jailbreak/violence gets the category decline. Log for review. |

**Why Medium folds into Block, not Allow:** Medium-severity messages were originally meant to receive a *constrained* response (hints instead of a full answer, simplified language) rather than an outright decline — see "Deferred: Constrained Responses" below for why that's not implemented in M9. With no constrained-response path available, the only two real choices for a Medium-severity message are Allow-as-if-Low or Block-as-if-High. Per the product owner's priority ("Safety overrides groundedness, accuracy, teaching quality, and personalization... it's a child-focused educational platform"), and per this document's own pre-existing Confidence and Escalation principle (uncertainty resolves toward caution, never convenience), Medium blocks rather than silently passing through unconstrained.

This table is the one Safety Agent (full) is expected to implement against. If a future implementation adds a genuine third action, that's a Policy Engine revision (versioned, see below), not a silent deviation.

---

# Deferred: Constrained Responses

The "Medium → provide hints instead of full answers" behavior `03_Safety_Agent.md` originally described is real, intended long-term architecture — **not** rejected, just out of scope for M9. It requires a routing/prompt-transformation capability that doesn't exist anywhere in this codebase yet: a way for Safety Agent to hand Concept/Practice Agent a *constrained version* of the request (e.g. "answer this, but hints only, no complete solution") rather than either the full original request or an outright block. Building partial plumbing for this now — without the actual constraint-carrying mechanism agents downstream would need to honor it — would be guessed-at infrastructure, the same risk M5 avoided with the embedding provider. Revisit once there's a concrete design for how a "constrained" instruction would actually reach Concept/Practice/Assessment Agent's prompts (likely an extension of Personalization's `describePersonalizationForPrompt()` pattern, but that's a future design decision, not this document's to make).

---

# Confidence and Escalation

Per `03_Safety_Agent.md`'s Recovery Strategy ("If confidence is low: Request clarification... If risk remains unclear: Use safest acceptable response") — when Safety Agent's own confidence in a risk-level determination is below a threshold (to be tuned once real usage data exists, per the spec's own "adaptive safety thresholds" Future Enhancement), the engine defaults to the *stricter* action (Block), not the lenient one (Allow). Symmetric with M3's Planning Agent Diagnostic-strategy default ("if learner profile is incomplete, ask diagnostic questions") — uncertainty always resolves toward caution here, never convenience.

---

# Versioning

Policy content changes (new categories, changed thresholds, revised age bands) are expected over time, per `03_Safety_Agent.md`'s own Future Enhancements ("Dynamic policy updates, Regional curriculum policies"). This document should be versioned the same way `09_Curriculum_Foundation.md` and `12_Learner_Profile_Model.md` are — a version bump and changelog note, not silent edits — since Safety Agent's behavior is directly downstream of this content.

---

# What This Document Does Not Cover

- **Regional/jurisdictional policy variation** (e.g. different academic integrity norms by country) — `03_Safety_Agent.md` lists "Regional curriculum policies" as a Future Enhancement; this version is single-region.
- **Guardian/teacher override workflows** — also a named Future Enhancement, not yet designed.
- **The specific detection mechanism** (classifier, keyword rules, LLM-based judgment) — an implementation decision for whoever builds M9, informed by this content but not decided by it.

---

# Open Questions for Review

Two of the three originally flagged here are resolved (see the 2026-07-12 Revision note at the top): pipeline ordering (Safety before Router) and the Medium-risk constrained-response question (deferred, not implemented). One remains open:

1. Are the four age bands (Primary/Middle/High/Unknown) the right granularity, or should this match a different grade-banding already used elsewhere (none currently exists outside this draft)? Not addressed in the 2026-07-12 review — still open before implementation should rely on it.
