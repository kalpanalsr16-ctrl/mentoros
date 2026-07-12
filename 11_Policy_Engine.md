# Policy Engine

**Product:** MentorOS

**Version:** 1.0 (Draft — proposed, not yet reviewed)

**Status:** Draft

**Author:** Drafted by Claude at the product owner's request, to unblock M9's Safety Agent (full); pending review

---

# Purpose

`05_Agent_Architecture/03_Safety_Agent.md` names "Policy Engine" as a hard dependency and lists "Policy Rules," "Age Guidelines," "Academic Integrity Rules," and "Platform Security Rules" under its Knowledge Access section, but no document defines what those rules actually are, how they're structured, or how a risk level maps to an action. This document is that definition — the source of truth Safety Agent (full) reads from, the same relationship `09_Curriculum_Foundation.md` has to Knowledge Retrieval Agent and `12_Learner_Profile_Model.md` has to Memory Agent.

This document does not itself decide how Safety Agent is implemented (rule-based, model-based, hybrid) — that remains an implementation decision for whoever builds M9's Safety Agent. It defines the policy *content* Safety Agent must enforce, independent of how.

---

# Relationship to M0's Baseline Filter

MentorOS already has a safety mechanism: `checkMessageSafety()` (`web/src/lib/safety/filter.ts`), a deterministic keyword-pattern filter covering four categories (`self_harm`, `violence`, `sexual_content`, `prompt_injection`), built in M0 explicitly as a placeholder ("intentionally simple... The full Safety Agent spec... is implemented properly in Milestone M9, once real usage patterns exist"). This Policy Engine document is the bridge between that placeholder and the full spec: every category below either matches, extends, or supersedes one of M0's four.

---

# Policy Categories

Mirrors `03_Safety_Agent.md`'s Safety Categories section exactly — this section is each category's actual rule content, not a restatement of what the category is for.

## 1. Educational Safety

**Rule:** Flag responses containing unsupported mathematical/factual claims, curriculum mismatches, or hallucinated concepts not grounded in the retrieved Knowledge Package (M5).

**Depends on:** Knowledge Retrieval Agent's Knowledge Package as the grounding source. Without a resolved concept, this category cannot evaluate groundedness and should not attempt to (matches the honest limitation already accepted in M6-M8: no concept resolved means no Knowledge Package to check against).

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

# Risk Levels → Required Actions

Formalizes `03_Safety_Agent.md`'s Risk Levels section into an explicit mapping (the spec named the levels and gave one example each; this is the complete table):

| Risk Level | Trigger | Required Action |
|---|---|---|
| **Low** | No policy category flags the request. | Continue normally — full teaching pipeline (M1–M8) unchanged. |
| **Medium** | One category flags with low-to-moderate confidence, or Academic Integrity flags a hint-appropriate request. | Continue, but constrain the response: hints/guided reasoning instead of a complete answer (Academic Integrity), or simplify language/examples (Child Safety, Educational Safety borderline cases). |
| **High** | One category flags with high confidence, or multiple categories flag simultaneously. | Do not proceed to the normal teaching pipeline. Request clarification from the learner, or return a category-appropriate decline (mirrors M0's `buildSafetyDeclineMessage()` pattern) without generating a full teaching response. |
| **Critical** | Self-harm, violence, or a confirmed jailbreak/prompt-injection attempt. | Terminate the request before any Claude call for teaching purposes. Escalate: self-harm gets M0's existing crisis-resource decline message (unchanged); jailbreak/violence gets M0's existing category decline. Log for review. |

This table is the one Safety Agent (full) is expected to implement against. If a future implementation needs a different mapping, that's a Policy Engine revision (versioned, see below), not a silent deviation.

---

# Confidence and Escalation

Per `03_Safety_Agent.md`'s Recovery Strategy ("If confidence is low: Request clarification... If risk remains unclear: Use safest acceptable response") — when Safety Agent's own confidence in a risk-level determination is below a threshold (to be tuned once real usage data exists, per the spec's own "adaptive safety thresholds" Future Enhancement), the engine defaults to the *next stricter* action, not the lenient one. Symmetric with M3's Planning Agent Diagnostic-strategy default ("if learner profile is incomplete, ask diagnostic questions") — uncertainty always resolves toward caution here, never convenience.

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

Flagging explicitly rather than silently deciding, per this project's own working principle ("if documentation conflicts internally, stop and ask"):

1. Are the four age bands (Primary/Middle/High/Unknown) the right granularity, or should this match a different grade-banding already used elsewhere (none currently exists outside this draft)?
2. Is the Medium-risk "constrain the response" behavior (hints instead of full answers) something Concept/Practice Agent can actually act on today, or does it need its own wiring (similar to how Personalization's profile reaches `generateTeachingReply`)?
3. Should Critical-risk termination happen *before* or *after* Router Agent's intent classification runs (i.e., does Safety Agent gate Router, or run in parallel)? `03_Safety_Agent.md`'s own Decision Logic runs safety checks first, but its Dependencies section lists Router Agent as a dependency, implying Safety needs Router's output — these two statements aren't obviously reconcilable and should be resolved before implementation, not guessed at.
