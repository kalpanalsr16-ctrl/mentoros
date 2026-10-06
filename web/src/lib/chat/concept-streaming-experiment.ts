/**
 * Server-controlled assignment for progressive Concept streaming. The
 * treatment share comes from a server environment variable, which defaults
 * to 0 (everyone is control). Assignment is a deterministic hash of the trace
 * ID, so it is reproducible from telemetry and cannot be toggled by the client.
 */

export type ConceptStreamingArm = "control" | "treatment" | "ineligible";

export const CONCEPT_STREAMING_PERCENT_ENV = "CONCEPT_STREAMING_TREATMENT_PERCENT";

export function readTreatmentPercent(env: Record<string, string | undefined>): number {
  const parsed = Number.parseInt(env[CONCEPT_STREAMING_PERCENT_ENV] ?? "0", 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

/** Typed, learner-initiated turns only. Voice, retries, and automatic AI Tutor requests stay on the existing path. */
export function isEligibleForConceptStreaming(input: {
  modality: string;
  isRetry: boolean;
  source: string | null;
}): boolean {
  return input.modality === "text" && !input.isRetry && input.source === null;
}

/** FNV-1a over the trace ID, reduced to 0-99. */
export function trafficBucket(traceId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < traceId.length; index += 1) {
    hash ^= traceId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

export function assignConceptStreamingArm(input: {
  traceId: string;
  eligible: boolean;
  treatmentPercent: number;
}): ConceptStreamingArm {
  if (!input.eligible) return "ineligible";
  return trafficBucket(input.traceId) < input.treatmentPercent ? "treatment" : "control";
}
