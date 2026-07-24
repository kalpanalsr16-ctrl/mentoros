import { SAFETY_CLEAN_THRESHOLD, type EvaluationSourceAgent, type HallucinationRisk } from "@/lib/agents/evaluation-agent";

/**
 * Pure aggregation for the Evaluation Dashboard (Epic I1) --
 * docs/ui-architecture/06_Dashboard_Architecture.md's Widgets/Charts/
 * Tables list, scoped teacher-facing (per the approved scope-down: no
 * admin role/cross-student RLS exists in this schema, so this reads
 * only a teacher's own students' evaluation_completed/low_quality_detected/
 * hallucination_detected events -- see get-evaluation-analytics.ts).
 * Same event-sourced-trend technique as progress-analytics-aggregation.ts's
 * buildMasteryTrend, generalized across all six scored dimensions plus
 * the computed overallScore.
 */

export type EvaluationDimension =
  | "overallScore"
  | "groundedness"
  | "accuracy"
  | "educationalQuality"
  | "personalization"
  | "clarity"
  | "safety";

export const EVALUATION_DIMENSIONS: EvaluationDimension[] = [
  "overallScore",
  "groundedness",
  "accuracy",
  "educationalQuality",
  "personalization",
  "clarity",
  "safety",
];

export type EvaluationCompletedRow = {
  createdAt: string;
  sourceAgent: EvaluationSourceAgent;
  overallScore: number;
  groundedness: number | null;
  accuracy: number;
  educationalQuality: number;
  personalization: number;
  clarity: number;
  safety: number;
  hallucinationRisk: HallucinationRisk | null;
};

export type TrendPoint = { date: string; value: number };

/** groundedness is skipped for a given event when null (no concept resolved), same as it's excluded from computeOverallScore's own renormalization -- never averaged in as a 0. */
export function buildDimensionTrends(rows: EvaluationCompletedRow[]): Record<EvaluationDimension, TrendPoint[]> {
  const result = {} as Record<EvaluationDimension, TrendPoint[]>;
  for (const dimension of EVALUATION_DIMENSIONS) {
    const byDate = new Map<string, number[]>();
    for (const row of rows) {
      const value = row[dimension];
      if (value === null) continue;
      const date = row.createdAt.slice(0, 10);
      const values = byDate.get(date) ?? [];
      values.push(value);
      byDate.set(date, values);
    }
    result[dimension] = [...byDate.entries()]
      .map(([date, values]) => ({ date, value: values.reduce((sum, v) => sum + v, 0) / values.length }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return result;
}

/** % of evaluated interactions with a clean safety score (>= SAFETY_CLEAN_THRESHOLD) -- 0 for an empty window, not NaN. */
export function computeSafetyCleanRate(rows: EvaluationCompletedRow[]): number {
  if (rows.length === 0) return 0;
  const clean = rows.filter((r) => r.safety >= SAFETY_CLEAN_THRESHOLD).length;
  return (clean / rows.length) * 100;
}

/** % of evaluated interactions flagged High hallucination risk. */
export function computeHallucinationRiskRate(rows: EvaluationCompletedRow[]): number {
  if (rows.length === 0) return 0;
  const high = rows.filter((r) => r.hallucinationRisk === "High").length;
  return (high / rows.length) * 100;
}

export function filterBySourceAgent<T extends { sourceAgent: EvaluationSourceAgent }>(
  rows: T[],
  sourceAgent: EvaluationSourceAgent | null,
): T[] {
  if (!sourceAgent) return rows;
  return rows.filter((r) => r.sourceAgent === sourceAgent);
}

export type FlaggedReason = "low_quality" | "hallucination";

export type FlaggedInteractionRow = {
  traceId: string;
  sourceAgent: EvaluationSourceAgent;
  createdAt: string;
  reason: FlaggedReason;
  detail: string;
};

const FLAGGED_TABLE_LIMIT = 20;

/** "Low-quality/high-hallucination-risk interaction list" (06_Dashboard_Architecture.md) -- both event types merged, newest first, capped so this stays a short table, not a dump. */
export function buildFlaggedInteractions(rows: FlaggedInteractionRow[]): FlaggedInteractionRow[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, FLAGGED_TABLE_LIMIT);
}
