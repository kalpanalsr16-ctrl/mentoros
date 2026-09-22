import type { RevisionQueueItem } from "@/lib/revision/revision-queue-aggregation";

/**
 * Recommended Next (My Learning enhancement) -- the single most urgent
 * item, picked from the same real revision-queue data the Revision Queue
 * section already computes (reviewNow first, then reviewSoon, then
 * onWatch -- never manufactures urgency beyond what that queue already
 * found). Reasoning text is built only from real fields (masteryScore,
 * commonMistakes, days since practiced); the review-time estimate is a
 * fixed, disclosed UX estimate (not measured telemetry -- there is no
 * per-question timing data anywhere in this schema).
 */

const ESTIMATED_REVIEW_MINUTES = 5;

export type RecommendedNext = {
  conceptId: string;
  conceptName: string;
  reason: string;
  estimatedMinutes: number;
};

function daysSince(dateStr: string | null, now: Date): number | null {
  if (!dateStr) return null;
  return Math.floor((now.getTime() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000));
}

function buildReason(item: RevisionQueueItem, now: Date): string {
  const days = daysSince(item.lastPracticedAt, now);
  const mistake = item.commonMistakes[0];

  if (mistake) {
    return `You've run into "${mistake}" here${days !== null ? `, and it's been ${days} day${days === 1 ? "" : "s"} since you last practiced` : ""}.`;
  }
  if (days !== null) {
    return `It's been ${days} day${days === 1 ? "" : "s"} since you last practiced this, and it's due for reinforcement.`;
  }
  return "You haven't practiced this one yet, and it's ready for reinforcement.";
}

export function buildRecommendedNext(
  queue: { reviewNow: RevisionQueueItem[]; reviewSoon: RevisionQueueItem[]; onWatch: RevisionQueueItem[] },
  now: Date = new Date(),
): RecommendedNext | null {
  const top = queue.reviewNow[0] ?? queue.reviewSoon[0] ?? queue.onWatch[0];
  if (!top) return null;

  return {
    conceptId: top.conceptId,
    conceptName: top.conceptName,
    reason: buildReason(top, now),
    estimatedMinutes: ESTIMATED_REVIEW_MINUTES,
  };
}
