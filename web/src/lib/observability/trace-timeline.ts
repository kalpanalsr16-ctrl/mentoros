import type { AgentNodeView } from "@/lib/observability/transparency-provider";

export type TimelineSegment = { agent: string; latencyMs: number; share: number };

/**
 * Splits the measured stage latencies into shares of their total, for the
 * Flight Recorder's stage-duration bar. Stages with no measured latency
 * (deterministic Planning/Memory, derived Knowledge) are returned by name
 * instead, so the UI can label them honestly rather than inventing a duration.
 */
export function timelineSegments(nodes: AgentNodeView[]): { segments: TimelineSegment[]; unmeasured: string[] } {
  const measured = nodes.filter((n): n is AgentNodeView & { latencyMs: number } => n.latencyMs !== null);
  const total = measured.reduce((sum, n) => sum + n.latencyMs, 0);
  const segments = total > 0 ? measured.map((n) => ({ agent: n.agent, latencyMs: n.latencyMs, share: n.latencyMs / total })) : [];
  const unmeasured = nodes.filter((n) => n.latencyMs === null && !n.derived).map((n) => n.agent);
  return { segments, unmeasured };
}
