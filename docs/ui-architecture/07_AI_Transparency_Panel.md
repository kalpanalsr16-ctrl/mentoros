# AI Transparency Panel — Flagship Feature

This panel is the single highest-leverage surface named anywhere in Phase 2 (`15_Phase2_Roadmap.md` §12, Phase 2: "the single highest-leverage phase for the named showcase audience specifically"). It is the first time M0–M9's real, live-verified multi-agent pipeline becomes visible to a human. Every field specified below is sourced from data that **already exists and is already logged** — this document adds a rendering layer over `getObservabilityReport()` (`web/src/lib/agents/observability-agent.ts`) and the token-logging fields every agent now writes; it proposes zero new agent behavior.

**Hard rule, repeated per section below rather than assumed once:** every section shows the agent's *decision*, never its prompt, chain-of-thought, or raw model reasoning. "Safety: Allow (Low risk)" — never the text of the Safety system prompt or the model's internal justification. This is what makes the panel safe to show a student, a teacher, and a showcase reviewer alike.

---

## Panel structure

A vertically stacked list of agent nodes, one per pipeline stage, in the exact order M0–M9's `route.ts` actually executes them (Safety → Router → Planning → Knowledge Retrieval → Concept/Practice/Assessment → Reflection → Memory → Evaluation), plus a summary header (Cost/Latency/Tokens) and an Observability footer. Each node uses the `AgentTraceNode` pattern from the Design System (`docs/design-system/03-Component-Library.md` §7.3).

```
┌─────────────────────────────────┐
│ How I answered            [x]   │
│ 1.2s total · $0.004 · 1,840 tok │  ← summary header
├─────────────────────────────────┤
│ ▸ Safety          Allow    45ms │
│ ▸ Router           Concept 210ms│
│ ▸ Planning       ConceptFirst   │
│ ▸ Knowledge       resolved      │
│ ▾ Concept                615ms  │  ← expanded
│    "Explained Addition,          │
│     next: Practice, conf. 0.92"  │
│ ▸ Evaluation       92/100  180ms│
├─────────────────────────────────┤
│ View full trace →                │
└─────────────────────────────────┘
```

---

## Safety Agent

- **Displayed information:** decision (Allow/Block), risk level, category (only if Block), confidence, latency, and — when Layer 2 ran — model/tokens/cost. Sourced from `message_received`/`safety_blocked` events, already carrying every one of these fields since the Token-Logging Housekeeping Pass.
- **Expand/collapse:** collapsed by default shows only decision + latency; expanded shows risk level/category/confidence.
- **Visual hierarchy:** first node, always — Safety runs before everything else in the real pipeline, and the panel's order must never silently reorder that fact.
- **Future debugging:** a filtered "show me every Block this week" view feeding directly into `03_Teacher_Studio.md`'s Misconception/Analytics surfaces.

## Router Agent

- **Displayed information:** primary intent, secondary intent (if any), confidence, topic/subtopic, latency, model/tokens/cost. Sourced from `intent_detected`/`routing_failed`.
- **Expand/collapse:** collapsed shows intent only; expanded shows confidence + topic/subtopic.
- **Visual hierarchy:** second node.
- **Future debugging:** confidence-threshold tuning view (surfacing how often Router's `needsClarification` path fires) — analysis tooling, not a change to Router's own logic.

## Planning Agent

- **Displayed information:** strategy (e.g. `ConceptFirst`/`Diagnostic`), difficulty, pace, whether a concept resolved. Sourced from `learning_plan_created`/`planning_failed`. **No model/tokens/cost shown** — Planning Agent is deterministic decision logic (`decidePlan()`), not a Claude call, and the panel must represent that accurately rather than implying every node costs money and time equally.
- **Expand/collapse:** collapsed shows strategy only; expanded shows difficulty/pace/follow-up-required.
- **Visual hierarchy:** third node.
- **Future debugging:** none proposed — this is already fully deterministic and traceable.

## Knowledge Retrieval

- **Displayed information:** whether a concept resolved, and which one (name only, not the full Knowledge Package). **Real, current limitation, stated plainly:** Knowledge Retrieval has no dedicated event name of its own in today's system — its activity is only visible indirectly via `learning_plan_created`'s `conceptResolved` field. This panel section is honest about that: it shows what's available (resolved concept name), not a fabricated "Knowledge Retrieval ran for Xms" figure that doesn't exist in the data.
- **Expand/collapse:** collapsed shows resolved concept name only; nothing further to expand today.
- **Visual hierarchy:** fourth node, visually marked as "derived" rather than "logged" (a small distinction in the `AgentTraceNode` pattern — see `08_Component_Ownership.md`) so a technical reviewer isn't misled into thinking this is first-class event data.
- **Future debugging:** the real fix is a dedicated `knowledge_retrieved` event at the source (an M0–M9 code change) — named here as a prerequisite for a fully accurate panel, explicitly not undertaken by this document per the "do not touch M0–M9" constraint.

## Concept / Practice / Assessment Agent (whichever ran this turn — at most one does, by the pipeline's own construction)

- **Displayed information:** which of the three ran; its structured output summary (Concept: next step + confidence; Practice: difficulty + question count; Assessment: mastery score + status + misconception count); latency, model, tokens, cost. Sourced from `concept_explained`/`practice_generated`/`assessment_completed` (or their `_failed` counterparts).
- **Expand/collapse:** collapsed shows the one-line summary; expanded shows the full structured fields (but never the raw prompt).
- **Visual hierarchy:** fifth node — the "main event" of the turn, given slightly more visual weight (`heading-sm` vs. `body-sm` for other nodes) than the surrounding pipeline steps.
- **Future debugging:** a "compare to previous attempt" view for Assessment specifically, once `02_Student_Experience.md`'s Assessment History exists to compare against.

## Reflection Agent

- **Displayed information:** learning status, confidence, recommended action — shown here even though never shown in the main chat stream (`05_Chat_Experience.md`'s explicit internal-only rule for Reflection applies to the *chat stream*, not this diagnostic panel, which exists precisely to show internal agent activity). Sourced from `reflection_completed`/`reflection_failed`.
- **Expand/collapse:** collapsed shows learning status only; expanded shows confidence + recommended action.
- **Visual hierarchy:** sixth node, only appears on turns where Assessment ran (Reflection's actual trigger, per `11_Reflection_Agent.md`) — absent, not empty, on every other turn.
- **Future debugging:** none proposed beyond what's already visible.

## Memory Agent

- **Displayed information:** whether a profile update was applied, which concept, new mastery score. Sourced from `learner_profile_updated`. **No model/tokens/cost** — Memory Agent is a pure deterministic merge (`updateLearnerProfile()`), not a Claude call, same honesty rule as Planning above.
- **Expand/collapse:** collapsed shows "profile updated" + concept; expanded shows old→new mastery score delta (requires reading the prior `learner_concept_mastery` value — a small additional read, not a new write).
- **Visual hierarchy:** seventh node, same conditional-appearance rule as Reflection.
- **Future debugging:** none proposed.

## Evaluation Agent

- **Displayed information:** overall score, quality status, the six dimension scores (groundedness/accuracy/educationalQuality/personalization/clarity/safety — `07_Evaluation_Framework.md`'s exact set), hallucination risk, and Evaluation's *own* call cost/latency (distinct from the source agent's, per the already-shipped `evaluationCostUsd`/`evaluationLatencyMs` fields). Sourced from `evaluation_completed`/`evaluation_failed`.
- **Expand/collapse:** collapsed shows overall score + quality status; expanded shows all six dimensions as a small bar/ring set.
- **Visual hierarchy:** eighth node, last in the per-turn sequence — matches its actual execution order (runs after Concept/Practice/Assessment succeed).
- **Future debugging:** direct link into the Evaluation Dashboard (`06_Dashboard_Architecture.md`) for this interaction's score in the context of the trend over time, once Phase 5 ships.

## Observability

- **Displayed information:** this isn't a pipeline node — it's the panel's own summary header (trace ID, total latency, total tokens, total cost, error count) plus a "View full trace" link to `/explorer` (`06_Dashboard_Architecture.md`'s Architecture Explorer, which is this exact panel's design reused at full-page scale for a single trace).
- **Expand/collapse:** the summary header is always visible, never collapsed — it's the panel's orientation point.
- **Visual hierarchy:** top of the panel, above every agent node.
- **Future debugging:** the "View full trace" link is this panel's forward-compatible seam into whatever richer debugging Architecture Explorer eventually grows (`12_Future_Extensibility.md`).

## Cost / Latency / Tokens

Not separate sections — woven through every node above (each shows its own latency; Concept/Practice/Assessment/Router/Safety/Reflection/Evaluation additionally show tokens/cost where they made a real Claude call) and summarized once in the header. This is a deliberate structural choice: showing cost/latency/tokens as their own isolated section would disconnect the number from the decision that produced it, undermining the "show your work" principle (`docs/design-system/01-Architecture-Design.md` §1.3) this whole panel exists to serve.
