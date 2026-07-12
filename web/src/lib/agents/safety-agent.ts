import type { ClaudeMessage } from "@/lib/agents/context-agent";
import type { SafetyCheckResult, SafetyCategory } from "@/lib/safety/filter";
import type { SafetyClassificationResult } from "@/lib/llm/client";

/**
 * Per 03_Safety_Agent.md's Risk Levels section -- kept as four values for
 * observability/telemetry even though M9 only enforces two actions (see
 * deriveSafetyAction below), per 11_Policy_Engine.md's Enforcement
 * Actions decision.
 */
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type SafetyAssessment = {
  safe: boolean;
  riskLevel: RiskLevel;
  category?: SafetyCategory;
  confidence: number;
  action: "Allow" | "Block";
  // Only present when Layer 2 (the Claude call) actually ran and
  // succeeded -- absent when Layer 1 alone decided the outcome, or when
  // Layer 2's own call failed (the fail-closed branch below).
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * The complete M9 enforcement mapping, per 11_Policy_Engine.md's
 * Enforcement Actions table: Low -> Allow, Medium/High/Critical -> Block.
 * Exported and pure so the mapping itself -- not just the surrounding
 * orchestration -- is directly unit-testable.
 */
export function deriveSafetyAction(riskLevel: RiskLevel): "Allow" | "Block" {
  return riskLevel === "Low" ? "Allow" : "Block";
}

/**
 * Two-layer Safety Agent (M9), per 03_Safety_Agent.md + 11_Policy_Engine.md.
 * Runs BEFORE Router Agent -- the first thing to touch an incoming
 * message (see 03_Safety_Agent.md's 2026-07-12 Revision note).
 *
 * Layer 1 is the M0 keyword filter (checkMessageSafety) -- free,
 * deterministic, and per Policy Engine's explicit requirement, the
 * confirmed floor full Safety Agent must not regress below. The caller
 * runs it and passes the result in as `layer1Result`, rather than this
 * function calling it a second time.
 *
 * Layer 2 (this function, only when Layer 1 didn't already flag the
 * message) is the new LLM-based classification, injected as `classify` --
 * same seam router-agent.ts's classifyIntent already uses. Layer 2 only
 * evaluates the categories that can actually apply pre-generation (Child
 * Safety, Prompt Injection, Academic Integrity, Privacy, Platform
 * Safety) -- Educational Safety requires a generated response to check
 * against, which doesn't exist yet at this point in the pipeline; that
 * concern belongs to Evaluation Agent, post-generation.
 *
 * Deliberately fails CLOSED (Block), not open, when Layer 2's call itself
 * fails (rate limit, API error, etc.) -- the one agent in this codebase
 * that does this. Every other agent (Router, Concept, Practice,
 * Assessment, Reflection) fails open into a degraded-but-functional path
 * on a transient error, since an enhancement failing shouldn't take down
 * the whole feature. Safety Agent is not an enhancement layered on top
 * of something else -- it is the gate -- and per 11_Policy_Engine.md's
 * Confidence and Escalation principle ("uncertainty resolves toward
 * caution, never convenience"), an unknown safety determination must not
 * silently become "Allow." Real consequence, stated plainly: a
 * transient Anthropic API outage blocks every message platform-wide
 * rather than degrading gracefully, for as long as the outage lasts.
 */
export async function evaluateSafety(
  history: ClaudeMessage[],
  layer1Result: SafetyCheckResult,
  classify: (history: ClaudeMessage[]) => Promise<SafetyClassificationResult>,
): Promise<SafetyAssessment> {
  if (!layer1Result.safe) {
    return {
      safe: false,
      riskLevel: "Critical",
      category: layer1Result.category,
      confidence: 1,
      action: "Block",
    };
  }

  const result = await classify(history);

  if (!result.success) {
    return {
      safe: false,
      riskLevel: "High",
      confidence: 0,
      action: "Block",
    };
  }

  const { classification, model, inputTokens, outputTokens } = result;
  const action = deriveSafetyAction(classification.riskLevel);

  return {
    safe: action === "Allow",
    riskLevel: classification.riskLevel,
    category: classification.category ?? undefined,
    confidence: classification.confidence,
    action,
    model,
    inputTokens,
    outputTokens,
  };
}
