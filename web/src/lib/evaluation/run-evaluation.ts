import type { ClaudeMessage } from "@/lib/agents/context-agent";
import {
  evaluateInteraction,
  type EvaluationAgentContext,
  type EvaluationReport,
  type EvaluationSourceAgent,
} from "@/lib/agents/evaluation-agent";
import type { PersonalizationProfile } from "@/lib/agents/personalization-agent";
import type { Concept } from "@/lib/knowledge/curriculum-types";
import { estimateCostUsd, generateEvaluation } from "@/lib/llm/client";
import { logEvent } from "@/lib/observability/trace";

/** Evaluation's inputs for one generated turn. Built by the pipeline; the same object is used in production and the benchmark. */
export type EvaluationRequest = {
  traceId: string;
  studentId: string;
  conversationId: string;
  sourceAgent: EvaluationSourceAgent;
  responseText: string;
  concept: Concept | null;
  personalizationProfile: PersonalizationProfile;
  latencyMs: number;
  history: ClaudeMessage[];
};

type EvaluationDb = Parameters<typeof logEvent>[0];

export type EvaluationCompletedPayload = {
  sourceAgent: EvaluationSourceAgent;
  model: string;
  overallScore: number;
  qualityStatus: EvaluationReport["qualityStatus"];
  groundedness: number | null;
  accuracy: number;
  educationalQuality: number;
  personalization: number;
  clarity: number;
  safety: number;
  hallucinationRisk: EvaluationReport["hallucinationRisk"] | null;
  evaluationInputTokens: number;
  evaluationOutputTokens: number;
  evaluationCostUsd: number;
  evaluationLatencyMs: number;
};

export type EvaluationOutcome =
  | { kind: "completed"; payload: EvaluationCompletedPayload }
  | { kind: "failed"; reason: string };

export type EvaluationDeps = {
  evaluate: typeof evaluateInteraction;
};

const DEFAULT_DEPS: EvaluationDeps = { evaluate: evaluateInteraction };

/**
 * The one Evaluation capability. Production calls it after the reply is saved;
 * the golden benchmark calls it and waits. Writes the same evaluation telemetry
 * either way, and never throws: failures are returned as `failed`.
 */
export async function runEvaluation(
  supabase: EvaluationDb,
  request: EvaluationRequest,
  deps: EvaluationDeps = DEFAULT_DEPS,
): Promise<EvaluationOutcome> {
  const base = {
    traceId: request.traceId,
    studentId: request.studentId,
    conversationId: request.conversationId,
  };
  try {
    const evaluationContext: EvaluationAgentContext = {
      sourceAgent: request.sourceAgent,
      responseText: request.responseText,
      concept: request.concept,
      personalizationProfile: request.personalizationProfile,
      latencyMs: request.latencyMs,
      history: request.history,
    };
    const evaluationStartedAt = Date.now();
    const evaluationResult = await deps.evaluate(evaluationContext, generateEvaluation);
    const evaluationLatencyMs = Date.now() - evaluationStartedAt;

    if (!evaluationResult.success) {
      await logEvent(supabase, {
        ...base,
        eventName: "evaluation_failed",
        payload: {
          sourceAgent: request.sourceAgent,
          reason: evaluationResult.reason,
          evaluationLatencyMs,
        },
      });
      return { kind: "failed", reason: evaluationResult.reason };
    }

    const { response } = evaluationResult;
    const payload: EvaluationCompletedPayload = {
      sourceAgent: request.sourceAgent,
      model: evaluationResult.model,
      overallScore: response.overallScore,
      qualityStatus: response.qualityStatus,
      groundedness: response.groundedness,
      accuracy: response.accuracy,
      educationalQuality: response.educationalQuality,
      personalization: response.personalization,
      clarity: response.clarity,
      safety: response.safety,
      hallucinationRisk: response.hallucinationRisk,
      // Evaluation's OWN call metadata -- distinct from `request.latencyMs`,
      // which is the source agent's latency that Evaluation's efficiency
      // score is computed from, not Evaluation's own cost to run.
      evaluationInputTokens: evaluationResult.inputTokens,
      evaluationOutputTokens: evaluationResult.outputTokens,
      evaluationCostUsd: estimateCostUsd(evaluationResult.inputTokens, evaluationResult.outputTokens),
      evaluationLatencyMs,
    };

    await logEvent(supabase, { ...base, eventName: "evaluation_completed", payload });

    if (response.qualityStatus === "NeedsImprovement") {
      await logEvent(supabase, {
        ...base,
        eventName: "low_quality_detected",
        payload: { sourceAgent: request.sourceAgent, overallScore: response.overallScore },
      });
    }

    if (response.hallucinationRisk === "High") {
      await logEvent(supabase, {
        ...base,
        eventName: "hallucination_detected",
        payload: { sourceAgent: request.sourceAgent, groundedness: response.groundedness },
      });
    }

    return { kind: "completed", payload };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    await logEvent(supabase, {
      ...base,
      eventName: "evaluation_failed",
      payload: { sourceAgent: request.sourceAgent, reason },
    });
    return { kind: "failed", reason };
  }
}
