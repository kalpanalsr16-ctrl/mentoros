import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Raw shape of a row from the `events` table -- matches
 * 0001_init.sql's `events` schema. `payload` is the jsonb column,
 * already parsed to a plain object by the Supabase client.
 */
export type EventRow = {
  event_name: string;
  payload: Record<string, unknown>;
  created_at: string;
  conversation_id: string | null;
  student_id: string | null;
};

/**
 * Maps every event name this codebase actually logs (M0-M9) to the
 * agent/component that produced it, per 14_Observability_Agent.md's
 * Trace Model ("Trace -> Session -> Conversation -> Events -> Agent
 * Executions -> ... -> Completion"). Kept as one exhaustive table so a
 * new event name added to route.ts without a matching entry here is a
 * visible gap (falls into "Unknown"), not a silent miscount.
 */
const EVENT_AGENT_MAP: Record<string, string> = {
  rate_limited: "RateLimit",
  message_received: "Safety",
  safety_blocked: "Safety",
  message_rejected: "System",
  reply_failed: "System",
  reply_sent: "System",
  safety_reply_sent: "System",
  intent_detected: "Router",
  routing_failed: "Router",
  learning_plan_created: "Planning",
  planning_failed: "Planning",
  personalization_profile_created: "Personalization",
  concept_explained: "Concept",
  concept_explanation_failed: "Concept",
  practice_generated: "Practice",
  practice_generation_failed: "Practice",
  assessment_completed: "Assessment",
  assessment_failed: "Assessment",
  reflection_completed: "Reflection",
  reflection_failed: "Reflection",
  learner_profile_updated: "Memory",
  memory_update_failed: "Memory",
  evaluation_completed: "Evaluation",
  evaluation_failed: "Evaluation",
  low_quality_detected: "Evaluation",
  hallucination_detected: "Evaluation",
  llm_call_succeeded: "Teaching",
  llm_call_failed: "Teaching",
};

/**
 * Event names representing something not working as intended --
 * distinct from safety_blocked/rate_limited, which are the system
 * correctly doing its job, not errors. Matches the spec's Outputs
 * example ("errors": 0) counting genuine failures, not legitimate
 * declines.
 */
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
  "message_rejected",
  "reply_failed",
]);

/**
 * Per-1M-token pricing for the one model this codebase calls
 * (claude-opus-4-8, set as MODEL in lib/llm/client.ts) -- if that
 * constant ever changes, this estimate should move with it. Not read
 * from client.ts directly to avoid a runtime dependency from this
 * read-only reporting module on the Anthropic SDK.
 */
const INPUT_COST_PER_MILLION_TOKENS_USD = 5;
const OUTPUT_COST_PER_MILLION_TOKENS_USD = 25;

export type AgentExecutionRecord = {
  agent: string;
  eventName: string;
  latencyMs: number | null;
};

/**
 * Per 14_Observability_Agent.md's Outputs example, renamed to camelCase.
 * `workflow` is a first-pass heuristic (see inferWorkflow below), not a
 * formally modeled concept anywhere else in this codebase.
 */
export type ObservabilityReport = {
  traceId: string;
  conversationId: string | null;
  studentId: string | null;
  workflow: string;
  totalLatencyMs: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
  errorCount: number;
  agentExecutions: AgentExecutionRecord[];
};

/**
 * First-pass workflow classification from which success events are
 * present -- not a formally modeled "session type" anywhere else in
 * this codebase. Checked in this order because a turn can only ever
 * have logged one of Concept/Practice/Assessment (M6/M7's mutual
 * exclusivity), so order only matters for the fallback cases.
 */
function inferWorkflow(eventNames: Set<string>): string {
  if (eventNames.has("concept_explained")) return "Concept Learning";
  if (eventNames.has("practice_generated")) return "Practice";
  if (eventNames.has("assessment_completed")) return "Assessment";
  if (eventNames.has("safety_blocked")) return "Safety Blocked";
  if (eventNames.has("llm_call_succeeded")) return "General Teaching";
  return "Unknown";
}

/**
 * Pure aggregation over raw event rows -- no Supabase dependency, so
 * this is directly unit-testable with hand-built event arrays. Given
 * only some events currently log `latencyMs`/`inputTokens`/
 * `outputTokens` in their payload (see this file's Open Issues in
 * docs/implementation/M9-02-Observability-Agent.md), this reads
 * whatever's present and never assumes a field exists.
 */
export function buildObservabilityReport(traceId: string, events: EventRow[]): ObservabilityReport {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const eventNames = new Set(sorted.map((e) => e.event_name));

  const agentExecutions: AgentExecutionRecord[] = sorted.map((e) => ({
    agent: EVENT_AGENT_MAP[e.event_name] ?? "Unknown",
    eventName: e.event_name,
    latencyMs: typeof e.payload.latencyMs === "number" ? e.payload.latencyMs : null,
  }));

  const latencies = agentExecutions.map((a) => a.latencyMs).filter((l): l is number => l !== null);
  const totalLatencyMs = latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) : null;

  const totalInputTokens = sorted.reduce(
    (sum, e) => sum + (typeof e.payload.inputTokens === "number" ? e.payload.inputTokens : 0),
    0,
  );
  const totalOutputTokens = sorted.reduce(
    (sum, e) => sum + (typeof e.payload.outputTokens === "number" ? e.payload.outputTokens : 0),
    0,
  );
  const estimatedCostUsd =
    (totalInputTokens / 1_000_000) * INPUT_COST_PER_MILLION_TOKENS_USD +
    (totalOutputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION_TOKENS_USD;

  const errorCount = sorted.filter((e) => FAILURE_EVENT_NAMES.has(e.event_name)).length;

  return {
    traceId,
    conversationId: sorted[0]?.conversation_id ?? null,
    studentId: sorted[0]?.student_id ?? null,
    workflow: inferWorkflow(eventNames),
    totalLatencyMs,
    totalInputTokens,
    totalOutputTokens,
    estimatedCostUsd,
    errorCount,
    agentExecutions,
  };
}

/**
 * Reads every `events` row for one trace_id and assembles the
 * Observability Report -- read-only, no new writes, no new agent call
 * in the request path. This is a reporting query, not a per-turn
 * decision/generation step the way every other agent in this codebase
 * (Safety through Evaluation) is; it runs on demand, not inside
 * /api/chat.
 */
export async function getObservabilityReport(
  supabase: SupabaseServerClient,
  traceId: string,
): Promise<ObservabilityReport> {
  const { data } = await supabase
    .from("events")
    .select("event_name, payload, created_at, conversation_id, student_id")
    .eq("trace_id", traceId);

  return buildObservabilityReport(traceId, data ?? []);
}
