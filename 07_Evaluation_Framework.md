# Evaluation Framework

**Product:** MentorOS

**Version:** 1.0 (Draft — proposed, not yet reviewed)

**Status:** Draft

**Author:** Drafted by Claude at the product owner's request, to unblock M9's Evaluation Agent; pending review

**Revision (2026-07-12):** Product owner decided Safety overrides Groundedness, Accuracy, Educational Quality, and Personalization in `overall_score` — "MentorOS is a child-focused educational platform." Implemented as a gate/ceiling, not a weighted-average component (see Overall Score, below) — a high weight alone would still let excellent scores on other dimensions partially compensate for a safety failure, which doesn't match "overrides."

---

# Purpose

`05_Agent_Architecture/13_Evaluation_Agent.md` names "Evaluation Framework" as both a hard dependency and a Knowledge Access source, and already defines *what* it measures (eight Evaluation Dimensions, a Quality Score band table, a Hallucination Detection pipeline) — but never defines *how* each dimension is actually scored, what evidence each score is computed from, or how the eight dimensions combine into the single `overall_score` its own Outputs example shows. This document is that missing scoring methodology — the source of truth Evaluation Agent reads from, the same relationship `09_Curriculum_Foundation.md` has to Knowledge Retrieval Agent.

This document does not redefine the dimensions or the quality bands `13_Evaluation_Agent.md` already states — it operationalizes them.

---

# Scoring Methodology, Per Dimension

Each dimension is scored 0–100. Evidence sources are the structured outputs already produced by M5–M8's agents — this framework introduces no new data collection, only a scoring method over data that already exists.

## Groundedness

**Evidence:** Concept Agent's `TeachingResponse` (M6) against the `Concept`/`LearningObjective`/`Misconception`/`TeachingStrategy` records the Knowledge Package (M5) actually resolved for that turn.

**Method:** Does the response's `explanation`/`example` content correspond to information present in the resolved Knowledge Package, or does it introduce claims the Knowledge Package doesn't support? Score reduces per unsupported claim. A turn where no concept resolved at all (M6's Diagnostic-gated fallback) is not evaluable for groundedness — exclude it from this dimension rather than scoring it 0 or 100, since there was no Knowledge Package to ground against.

## Accuracy

**Evidence:** Same as Groundedness, plus general subject-matter correctness independent of the Knowledge Package (e.g. the arithmetic in a worked example is actually correct).

**Method:** Distinct from Groundedness — a response can be perfectly grounded in the Knowledge Package and still contain an arithmetic error the Knowledge Package itself wouldn't catch (e.g. a wrong worked-example calculation). Score reduces per factual/computational error found.

## Educational Quality

**Evidence:** Concept Agent's `TeachingResponse.nextStep`/`confidence` (M6), Reflection Agent's `learningStatus` (M8) for the same turn, when available.

**Method:** Did the response follow the Connect→Explain→Illustrate→Example→Check Understanding framework (`08_Concept_Agent.md`), not just answer the question? A response missing a Check Understanding step, or that just states an answer without building intuition, scores lower even if factually correct — this is the dimension that distinguishes "correct" from "well-taught."

## Personalization

**Evidence:** The `PersonalizationProfile` (M4) computed for that turn, compared against the actual response's tone/complexity/example style.

**Method:** Does the response's `teachingStyle`/`exampleStyle`/`difficulty` actually match what `describePersonalizationForPrompt()` instructed? This measures instruction-following, not whether the *profile itself* was the right one to compute (that's Reflection Agent's job, not Evaluation's, per `13_Evaluation_Agent.md`'s Out of Scope).

## Clarity

**Evidence:** The response text itself, plus the learner's recorded `grade` (M8) if known.

**Method:** Reading-level appropriateness for the recorded grade (or the Unknown-grade default band, per `11_Policy_Engine.md`), sentence structure, absence of unexplained jargon. Independent of Educational Quality — a response can follow the teaching framework structurally (high Educational Quality) while still being written above the learner's level (low Clarity).

## Teaching Effectiveness

**Evidence:** Whether a follow-up turn in the same conversation continued the topic, and (once available) Assessment Agent's `masteryScore` (M7) on a subsequent related turn.

**Method:** This is the one dimension that cannot be scored at the moment a response is generated — it requires a later signal (did the learner continue, did their next assessment improve). Score this dimension asynchronously/retroactively, not as part of the same-turn evaluation the other seven dimensions use. Flag as `pending` until that later signal exists, rather than guessing a score with no evidence.

## Safety

**Evidence:** The generated teaching response's text itself, checked against `11_Policy_Engine.md`'s Policy Categories.

**Method:** Not a pass-through of Safety Agent's own gate decision — per `11_Policy_Engine.md`'s Pipeline Position, Safety Agent runs *before* Router/Planning/Concept Agent and only ever produces Allow/Block on the incoming *request*. By the time Evaluation Agent runs, the turn was necessarily Allowed (a Blocked turn never reaches generation, so there's nothing here to evaluate) — re-reporting "Allowed" as this dimension's score would be a constant, not a measurement. Instead, this dimension is an independent, defense-in-depth check on the *generated response*, re-applying the categories that still make sense post-generation: Child Safety (is the response's language/example age-appropriate for the recorded grade), Academic Integrity (did the response hand over a complete answer instead of guiding, even though the request itself passed the input gate), and Privacy (did the response leak anything it shouldn't). Educational Safety is deliberately not re-checked here — it's already covered by the Groundedness and Accuracy dimensions above, and double-counting it would let one underlying issue depress two supposedly independent scores.

## Efficiency

**Evidence:** `latencyMs`/`inputTokens`/`outputTokens` already logged in this turn's `events` row (every agent from M1 onward logs these).

**Method:** Direct computation from already-logged observability data — no new instrumentation needed. Compare against each agent's own documented Performance Target (e.g. Concept Agent's `<800ms`) rather than an arbitrary threshold.

---

# Overall Score

`13_Evaluation_Agent.md`'s Outputs example shows an `overall_score` alongside the per-dimension scores, but doesn't define the combination.

**Product owner decision (2026-07-12): Safety overrides every other dimension**, not merely outweighs them — "MentorOS is a child-focused educational platform." Implemented as a gate, computed in two steps:

**Step 1 — Safety gate.** Score the Safety dimension first (see Safety, above). If it finds any policy violation in the generated response:

```
overall_score = min(safety_subscore, 39)
```

This forces `overall_score` into the "Needs Improvement" band (below 70) regardless of how high Groundedness/Accuracy/Educational Quality/Personalization scored — a safety failure cannot be averaged away by an otherwise-excellent response. `safety_subscore` itself can be below 39 (a severe violation scores lower still); the `min()` just guarantees the ceiling, not a floor.

**Step 2 — Weighted average of the rest, only if Safety passes clean.** The remaining six same-turn dimensions combine as follows:

| Dimension | Weight | Rationale |
|---|---|---|
| Groundedness | 25% | Directly tied to M0's Trustworthiness principle — never invent or guess. Raised from the original 20% now that Safety is no longer part of this pooled percentage. |
| Accuracy | 25% | Equal weight to Groundedness — both are correctness, from different angles. |
| Educational Quality | 20% | The core differentiator this whole project exists for (Product Principle 1: "Learning before answering"). |
| Personalization | 15% | |
| Clarity | 10% | |
| Efficiency | 5% | Lowest weight — matters, but shouldn't dominate a quality score the way correctness should. |
| Teaching Effectiveness | *(excluded from `overall_score`)* | Computed retroactively (see above); folding an async, delayed-evidence dimension into a same-turn score would make `overall_score` non-deterministic at generation time. Reported separately once available. |

Weights sum to 100% across the six same-turn-computable, non-Safety dimensions. This table is a starting proposal for the *non-Safety* pool only — the Safety-overrides-everything principle itself is now settled, not open for revision without a new product decision.

---

# Quality Score Bands

Unchanged from `13_Evaluation_Agent.md`'s own table — restated here since this framework is where `overall_score` is actually computed against them:

| Score | Status |
|---|---|
| 95–100 | Excellent |
| 85–94 | Good |
| 70–84 | Acceptable |
| Below 70 | Needs Improvement |

---

# Hallucination Detection

`13_Evaluation_Agent.md`'s own Hallucination Detection section already defines the pipeline (AI Response → Retrieved Knowledge → Curriculum → Learning Objective, "any unsupported educational claim reduces confidence"). This framework's contribution: **`hallucination_risk` is derived from the Groundedness score above, not computed separately** — Low/Medium/High risk corresponds to Groundedness ≥ 90 / 70–89 / < 70, respectively. One computation, not two independent ones that could disagree with each other.

---

# What This Document Does Not Cover

- **LLM-as-a-Judge implementation details** (which model, what prompt) — `13_Evaluation_Agent.md` lists this as a Future Enhancement; this framework defines what to measure, not which technique measures it.
- **A/B testing methodology** — also a named Future Enhancement, out of scope here.
- **Human-in-the-loop review workflows** — same.

---

# Open Questions for Review

Question 1 from the original draft (dimension weighting vs. Safety priority) is resolved — see the 2026-07-12 Revision note at the top and the Overall Score section. Two remain:

1. Should Teaching Effectiveness's retroactive scoring update a turn's `overall_score` after the fact, or remain a permanently separate metric? Updating a historical score after the fact has real implications for any dashboard/report built on top of it.
2. Groundedness is marked "not evaluable" for Diagnostic-gated turns (no concept resolved) — should those turns be excluded from `overall_score` entirely, or scored on the remaining dimensions only? This affects how "100% of learner interactions" (the spec's own Evaluation Coverage target) should be interpreted.
