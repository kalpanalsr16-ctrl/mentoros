# ADR-003: A real multi-agent pipeline, not one large prompt

**Status:** Accepted
**Source:** [`05_Agent_Architecture/`](../../05_Agent_Architecture/) (one spec per agent), [`CHANGELOG.md`](../../CHANGELOG.md) (M1–M9)

## Context

A single, sufficiently detailed system prompt could plausibly produce similar-looking teaching replies with far less engineering. MentorOS's own stated goal, though, is to demonstrate a genuine multi-agent architecture — not to simulate one behind a single call.

## Decision

Split the tutoring flow into named, independently-specified agents, each with its own inputs/outputs/state/success-criteria document: **Safety → Router → Planning → Personalization → Concept/Practice/Assessment → Reflection → Memory → Evaluation**, plus the read-only **Observability Agent**. Each agent is its own module; the pipeline composes them via direct function calls in `route.ts`, not a shared mega-prompt.

## Consequences

- Every stage is independently inspectable — the AI Transparency Panel (ADR-008's UI half) can show *which* agent produced *which* decision, because those decisions are genuinely separate function calls with their own logged output, not a single LLM response parsed for sub-parts.
- Real cost: more LLM calls per turn than a single-prompt design would need (Router classifies intent before Planning even runs; Safety gates before Router). This is a deliberate trade — transparency and independent testability over minimum token spend.
- Each agent's system prompt is a pure, exported builder function (e.g. `buildConceptAgentSystemPrompt()`), independently unit-testable without a real API call — the actual Claude call happens centrally in `lib/llm/client.ts`, which every agent module feeds into but never duplicates.
- This is also why `lib/llm/client.ts` and every file under `lib/agents/` are flagged "touches completed architecture" in the implementation sequence — the pipeline's shape is a deliberate, reviewed structure, not an incidental one, and any change to it needs the same scrutiny that built it.
