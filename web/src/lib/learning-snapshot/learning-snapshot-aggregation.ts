import type { OverviewConcept } from "@/lib/learning-overview/learning-overview-aggregation";
import type { RetentionWeekBucket } from "@/lib/retention/retention-aggregation";

/**
 * The 4 top metric cards on My Learning (Snapshot row). Every number here
 * is derived from data already computed elsewhere (OverviewConcept's
 * status/masteryScore/retentionScore, plus real first-encountered
 * timestamps) -- nothing is a separate source of truth. Week-over-week
 * deltas are only shown when there's a real prior period to compare
 * against; otherwise the delta line is omitted rather than shown as a
 * fabricated "+0%".
 *
 * needsRevision is deliberately NOT computed independently here -- it is
 * passed in as `reviewNowCount`, the exact same count the Revision Queue
 * and Recommended Next sections already compute (revision-queue-
 * aggregation.ts's `reviewNow` tier: mastery is "weak", OR retention has
 * decayed below RETENTION_FADING_THRESHOLD even for a previously
 * mastered concept). A concept only counts as needing revision once,
 * using one shared definition, everywhere on the page.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type LearningSnapshot = {
  topicsDiscovered: number;
  discoveredThisWeek: number | null;
  topicsMastered: number;
  masteredPercentOfDiscovered: number | null;
  retentionScore: number | null; // 0-100, mean over attempted concepts
  retentionDeltaThisWeek: number | null; // percentage points, +/-
  needsRevision: number;
};

export function buildLearningSnapshot(
  concepts: OverviewConcept[],
  firstEncounteredAt: Map<string, string>,
  retentionTrend: RetentionWeekBucket[],
  reviewNowCount: number,
  now: Date = new Date(),
): LearningSnapshot {
  const attempted = concepts.filter((c) => c.status !== "new");
  const topicsDiscovered = attempted.length;

  const weekAgo = now.getTime() - WEEK_MS;
  const discoveredThisWeek =
    topicsDiscovered === 0
      ? null
      : attempted.filter((c) => {
          const first = firstEncounteredAt.get(c.conceptId);
          return first !== undefined && new Date(first).getTime() >= weekAgo;
        }).length;

  const topicsMastered = attempted.filter((c) => c.status === "mastered").length;
  const masteredPercentOfDiscovered = topicsDiscovered > 0 ? Math.round((topicsMastered / topicsDiscovered) * 100) : null;

  const retentionScores = attempted.map((c) => c.retentionScore).filter((v): v is number => v !== null);
  const retentionScore =
    retentionScores.length > 0 ? Math.round(retentionScores.reduce((sum, v) => sum + v, 0) / retentionScores.length) : null;

  let retentionDeltaThisWeek: number | null = null;
  if (retentionTrend.length >= 2) {
    const latest = retentionTrend[retentionTrend.length - 1];
    const previous = retentionTrend[retentionTrend.length - 2];
    retentionDeltaThisWeek = latest.averageScore - previous.averageScore;
  }

  return {
    topicsDiscovered,
    discoveredThisWeek,
    topicsMastered,
    masteredPercentOfDiscovered,
    retentionScore,
    retentionDeltaThisWeek,
    needsRevision: reviewNowCount,
  };
}
