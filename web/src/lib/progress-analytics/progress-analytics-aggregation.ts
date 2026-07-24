/**
 * Pure aggregation for Progress Analytics (Epic G11) --
 * docs/ui-architecture/03_Teacher_Studio.md's Progress Analytics
 * section: "class/cohort-level trend view over time (distinct from
 * Class Overview's point-in-time snapshot)." learner_concept_mastery
 * has no history of its own -- only the current score -- so the trend
 * is derived from assessment_completed events instead, which already
 * carry a real masteryScore + created_at per turn. Those events' scale
 * is 0-100 (Assessment Agent's convention); this module normalizes to
 * 0-1 on the way out, matching every other avgMastery field in this app
 * (roster-aggregation.ts, get-class-overview.ts).
 */

export type MasteryEventRow = { createdAt: string; masteryScore: number };
export type TrendPoint = { date: string; avgMastery: number };

export const VALID_RANGES = ["7d", "30d", "90d"] as const;
export type Range = (typeof VALID_RANGES)[number];
const DEFAULT_RANGE: Range = "30d";

export function resolveRange(range: string | null): Range {
  return (VALID_RANGES as readonly string[]).includes(range ?? "") ? (range as Range) : DEFAULT_RANGE;
}

export function rangeToDays(range: Range): number {
  return Number(range.replace("d", ""));
}

/** Buckets by calendar day (UTC date portion of created_at), averaging that day's assessment scores -- one point per day that actually had activity, not a zero-filled point for every day in range. */
export function buildMasteryTrend(rows: MasteryEventRow[]): TrendPoint[] {
  const byDate = new Map<string, number[]>();

  for (const row of rows) {
    const date = row.createdAt.slice(0, 10);
    const scores = byDate.get(date) ?? [];
    scores.push(row.masteryScore / 100);
    byDate.set(date, scores);
  }

  return [...byDate.entries()]
    .map(([date, scores]) => ({ date, avgMastery: scores.reduce((sum, s) => sum + s, 0) / scores.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
