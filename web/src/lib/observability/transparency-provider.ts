import type { EventRow } from "@/lib/agents/observability-agent";

/**
 * Storage-agnostic contract for the AI Transparency Panel
 * (docs/ui-architecture/07_AI_Transparency_Panel.md), following the same
 * dependency-injection shape as KnowledgeProvider/LearnerStateProvider --
 * the UI depends on this interface, never on the `events` table schema
 * directly. Today's implementation reads Postgres; a future Langfuse-backed
 * (or blended) implementation can replace it without the panel or its
 * patterns changing.
 */
export interface TransparencyProvider {
  /** Null when the trace has no events -- either it doesn't exist, or RLS hid rows that belong to someone else. */
  getTraceView(traceId: string): Promise<TraceView | null>;
}

export type AgentNodeStatus = "success" | "blocked" | "failed";

export type AgentNodeDetail = { label: string; value: string };

/**
 * One pipeline stage, already shaped for display. `raw` is the original
 * event payload -- exposed only for an explicit, opt-in "inspect raw
 * payload" toggle (never shown by default), and is always a structured
 * decision record already logged by M0-M9, never a prompt or model
 * chain-of-thought (no event payload in this codebase has ever carried
 * either -- see route.ts's logEvent calls).
 */
export type AgentNodeView = {
  agent: string;
  status: AgentNodeStatus;
  headline: string;
  latencyMs: number | null;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  details: AgentNodeDetail[];
  raw: Record<string, unknown>;
  /** True only for the synthesized Knowledge Retrieval node, which has no event of its own -- see 07_AI_Transparency_Panel.md's "derived, not logged" distinction. */
  derived?: boolean;
};

export type TraceSummary = {
  traceId: string;
  conversationId: string | null;
  totalLatencyMs: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  errorCount: number;
};

export type TraceView = {
  summary: TraceSummary;
  nodes: AgentNodeView[];
};

const FAILURE_EVENT_NAMES = new Set([
  "routing_failed",
  "planning_failed",
  "concept_explanation_failed",
  "practice_generation_failed",
  "assessment_failed",
  "reflection_failed",
  "memory_update_failed",
  "evaluation_failed",
  "llm_call_failed",
]);

function num(payload: Record<string, unknown>, key: string): number | undefined {
  const v = payload[key];
  return typeof v === "number" ? v : undefined;
}

function str(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === "string" ? v : undefined;
}

/** Formats a value into a human-readable detail line, folding out undefined/null rather than showing "N/A". */
function detail(label: string, value: unknown): AgentNodeDetail | null {
  if (value === undefined || value === null || value === "") return null;
  return { label, value: typeof value === "number" ? String(value) : String(value) };
}

function compact(details: (AgentNodeDetail | null)[]): AgentNodeDetail[] {
  return details.filter((d): d is AgentNodeDetail => d !== null);
}

function safetyNode(e: EventRow): AgentNodeView {
  const blocked = e.event_name === "safety_blocked";
  return {
    agent: "Safety",
    status: blocked ? "blocked" : "success",
    headline: blocked ? "Block" : "Allow",
    latencyMs: num(e.payload, "latencyMs") ?? null,
    model: str(e.payload, "model"),
    inputTokens: num(e.payload, "inputTokens"),
    outputTokens: num(e.payload, "outputTokens"),
    costUsd: num(e.payload, "estimatedCostUsd"),
    details: compact([
      detail("Risk level", e.payload.riskLevel),
      blocked ? detail("Category", e.payload.category) : null,
      detail("Confidence", e.payload.confidence),
    ]),
    raw: e.payload,
  };
}

function routerNode(e: EventRow): AgentNodeView {
  const failed = e.event_name === "routing_failed";
  return {
    agent: "Router",
    status: failed ? "failed" : "success",
    headline: failed ? "Failed" : String(e.payload.primaryIntent ?? "Unknown"),
    latencyMs: num(e.payload, "latencyMs") ?? null,
    model: str(e.payload, "model"),
    inputTokens: num(e.payload, "inputTokens"),
    outputTokens: num(e.payload, "outputTokens"),
    costUsd: num(e.payload, "estimatedCostUsd"),
    details: failed
      ? compact([detail("Reason", e.payload.reason)])
      : compact([
          detail("Secondary intent", e.payload.secondaryIntent),
          detail("Confidence", e.payload.confidence),
          detail("Topic", e.payload.topic),
          detail("Subtopic", e.payload.subtopic),
        ]),
    raw: e.payload,
  };
}

function planningNode(e: EventRow): AgentNodeView {
  const failed = e.event_name === "planning_failed";
  return {
    agent: "Planning",
    status: failed ? "failed" : "success",
    // Deterministic decision logic, not a Claude call -- no model/tokens/cost,
    // same honesty rule 07_AI_Transparency_Panel.md states for Planning/Memory.
    headline: failed ? "Failed" : String(e.payload.strategy ?? "Unknown"),
    latencyMs: null,
    details: failed
      ? compact([detail("Reason", e.payload.reason)])
      : compact([
          detail("Difficulty", e.payload.difficulty),
          detail("Pace", e.payload.pace),
          detail("Follow-up required", e.payload.followUpRequired),
        ]),
    raw: e.payload,
  };
}

/** Synthesized, not logged -- Knowledge Retrieval has no event of its own today. */
function knowledgeNode(planningEvent: EventRow): AgentNodeView {
  const resolved = planningEvent.payload.conceptResolved === true;
  return {
    agent: "Knowledge",
    status: "success",
    headline: resolved ? "Concept resolved" : "No concept resolved",
    latencyMs: null,
    details: [],
    raw: {},
    derived: true,
  };
}

function mainAgentNode(e: EventRow): AgentNodeView {
  switch (e.event_name) {
    case "concept_explained":
      return {
        agent: "Concept",
        status: "success",
        headline: "Explained concept",
        latencyMs: num(e.payload, "latencyMs") ?? null,
        model: str(e.payload, "model"),
        inputTokens: num(e.payload, "inputTokens"),
        outputTokens: num(e.payload, "outputTokens"),
        costUsd: num(e.payload, "estimatedCostUsd"),
        details: compact([detail("Next step", e.payload.nextStep), detail("Confidence", e.payload.confidence)]),
        raw: e.payload,
      };
    case "practice_generated":
      return {
        agent: "Practice",
        status: "success",
        headline: "Generated practice set",
        latencyMs: num(e.payload, "latencyMs") ?? null,
        model: str(e.payload, "model"),
        inputTokens: num(e.payload, "inputTokens"),
        outputTokens: num(e.payload, "outputTokens"),
        costUsd: num(e.payload, "estimatedCostUsd"),
        details: compact([detail("Difficulty", e.payload.difficulty), detail("Questions", e.payload.questionCount)]),
        raw: e.payload,
      };
    case "assessment_completed":
      return {
        agent: "Assessment",
        status: "success",
        headline: `Mastery ${e.payload.masteryScore ?? "?"}`,
        latencyMs: num(e.payload, "latencyMs") ?? null,
        model: str(e.payload, "model"),
        inputTokens: num(e.payload, "inputTokens"),
        outputTokens: num(e.payload, "outputTokens"),
        costUsd: num(e.payload, "estimatedCostUsd"),
        details: compact([
          detail("Status", e.payload.status),
          detail("Recommended next step", e.payload.recommendedNextStep),
          detail("Misconceptions found", e.payload.misconceptionCount),
        ]),
        raw: e.payload,
      };
    case "llm_call_succeeded":
      return {
        agent: "Teaching",
        status: "success",
        headline: "General teaching reply",
        latencyMs: num(e.payload, "latencyMs") ?? null,
        model: str(e.payload, "model"),
        inputTokens: num(e.payload, "inputTokens"),
        outputTokens: num(e.payload, "outputTokens"),
        costUsd: num(e.payload, "estimatedCostUsd"),
        details: [],
        raw: e.payload,
      };
    default:
      return {
        agent: "Teaching",
        status: "failed",
        headline: "Failed",
        latencyMs: num(e.payload, "latencyMs") ?? null,
        details: compact([detail("Reason", e.payload.reason)]),
        raw: e.payload,
      };
  }
}

function reflectionNode(e: EventRow): AgentNodeView {
  const failed = e.event_name === "reflection_failed";
  return {
    agent: "Reflection",
    status: failed ? "failed" : "success",
    headline: failed ? "Failed" : String(e.payload.learningStatus ?? "Unknown"),
    latencyMs: num(e.payload, "latencyMs") ?? null,
    model: str(e.payload, "model"),
    inputTokens: num(e.payload, "inputTokens"),
    outputTokens: num(e.payload, "outputTokens"),
    costUsd: num(e.payload, "estimatedCostUsd"),
    details: failed
      ? compact([detail("Reason", e.payload.reason)])
      : compact([detail("Confidence", e.payload.confidence), detail("Recommended action", e.payload.recommendedAction)]),
    raw: e.payload,
  };
}

function memoryNode(e: EventRow): AgentNodeView {
  const failed = e.event_name === "memory_update_failed";
  return {
    agent: "Memory",
    status: failed ? "failed" : "success",
    // Deterministic merge, not a Claude call -- no model/tokens/cost.
    headline: failed ? "Failed" : "Profile updated",
    latencyMs: null,
    details: failed
      ? compact([detail("Reason", e.payload.reason)])
      : compact([detail("Mastery score", e.payload.masteryScore)]),
    raw: e.payload,
  };
}

function evaluationNode(e: EventRow): AgentNodeView {
  const failed = e.event_name === "evaluation_failed";
  return {
    agent: "Evaluation",
    status: failed ? "failed" : "success",
    headline: failed ? "Failed" : `${e.payload.overallScore ?? "?"}/100`,
    latencyMs: num(e.payload, "evaluationLatencyMs") ?? null,
    model: str(e.payload, "model"),
    inputTokens: num(e.payload, "evaluationInputTokens"),
    outputTokens: num(e.payload, "evaluationOutputTokens"),
    costUsd: num(e.payload, "evaluationCostUsd"),
    details: failed
      ? compact([detail("Reason", e.payload.reason)])
      : compact([
          detail("Quality status", e.payload.qualityStatus),
          detail("Groundedness", e.payload.groundedness),
          detail("Accuracy", e.payload.accuracy),
          detail("Educational quality", e.payload.educationalQuality),
          detail("Personalization", e.payload.personalization),
          detail("Clarity", e.payload.clarity),
          detail("Safety", e.payload.safety),
          detail("Hallucination risk", e.payload.hallucinationRisk),
        ]),
    raw: e.payload,
  };
}

/**
 * Pure aggregation over raw event rows -- no Supabase dependency, directly
 * unit-testable (mirrors observability-agent.ts's buildObservabilityReport
 * split, adapted for the panel's richer per-agent shape rather than a flat
 * engineering summary). Orders nodes in the fixed pipeline sequence
 * 07_AI_Transparency_Panel.md specifies, not raw chronological order, since
 * ties and near-simultaneous writes shouldn't visually reorder the pipeline.
 */
export function buildTraceView(traceId: string, events: EventRow[]): TraceView | null {
  if (events.length === 0) return null;

  const byName = new Map<string, EventRow>();
  for (const e of events) byName.set(e.event_name, e);

  const nodes: AgentNodeView[] = [];

  const safety = byName.get("message_received") ?? byName.get("safety_blocked");
  if (safety) nodes.push(safetyNode(safety));

  const router = byName.get("intent_detected") ?? byName.get("routing_failed");
  if (router) nodes.push(routerNode(router));

  const planning = byName.get("learning_plan_created") ?? byName.get("planning_failed");
  if (planning) nodes.push(planningNode(planning));
  if (byName.has("learning_plan_created")) nodes.push(knowledgeNode(byName.get("learning_plan_created")!));

  const mainNames = [
    "concept_explained",
    "concept_explanation_failed",
    "practice_generated",
    "practice_generation_failed",
    "assessment_completed",
    "assessment_failed",
    "llm_call_succeeded",
    "llm_call_failed",
  ];
  const main = mainNames.map((n) => byName.get(n)).find((e): e is EventRow => e !== undefined);
  if (main) nodes.push(mainAgentNode(main));

  const reflection = byName.get("reflection_completed") ?? byName.get("reflection_failed");
  if (reflection) nodes.push(reflectionNode(reflection));

  const memory = byName.get("learner_profile_updated") ?? byName.get("memory_update_failed");
  if (memory) nodes.push(memoryNode(memory));

  const evaluation = byName.get("evaluation_completed") ?? byName.get("evaluation_failed");
  if (evaluation) nodes.push(evaluationNode(evaluation));

  const latencies = nodes.map((n) => n.latencyMs).filter((l): l is number => l !== null);
  const totalLatencyMs = latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) : null;
  const totalInputTokens = nodes.reduce((sum, n) => sum + (n.inputTokens ?? 0), 0);
  const totalOutputTokens = nodes.reduce((sum, n) => sum + (n.outputTokens ?? 0), 0);
  const totalCostUsd = nodes.reduce((sum, n) => sum + (n.costUsd ?? 0), 0);
  const errorCount = events.filter((e) => FAILURE_EVENT_NAMES.has(e.event_name)).length;

  return {
    summary: {
      traceId,
      conversationId: events[0]?.conversation_id ?? null,
      totalLatencyMs,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd,
      errorCount,
    },
    nodes,
  };
}
