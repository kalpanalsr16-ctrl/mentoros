import { deriveStrength } from "@/lib/progress/progress-aggregation";
import { deriveRetention, classifyRetention } from "@/lib/retention/retention-aggregation";

/**
 * Revision Queue (My Learning enhancement) -- still replaces
 * revision_schedule as the data source (that table has zero writers
 * anywhere in this codebase); still derives everything from live
 * learner_concept_mastery. Extended from a single flat "below threshold"
 * list into 3 real urgency tiers plus a plain-language `reason`, so the
 * queue is actionable rather than just a status dump -- but the tier
 * labels are deliberately NOT "Today/Tomorrow/Later": this codebase has
 * repeatedly avoided implying a real due-date scheduler that doesn't
 * exist (see the old get-revision-data.ts's own comment on
 * revision_schedule), and "Tomorrow" would be exactly that kind of
 * unbacked promise. "Review now / Review soon / On watch" gives the same
 * 3-tier shape without claiming a calendar commitment MentorOS can't keep.
 *
 * All 3 tiers are cut from the same continuous retentionScore (see
 * retention-aggregation.ts) rather than a separate day-threshold rule --
 * retention already decays from day 1, so a day-count gate would either
 * be unreachable (contradicts the decay math for anything but perfect,
 * barely-touched mastery) or redundant with it. reviewNow/reviewSoon
 * split at the existing RETENTION_FADING_THRESHOLD; onWatch is the
 * upper half of the "fading" band -- still mostly fine, but a light
 * nudge before it becomes a real gap.
 */

const ON_WATCH_RETENTION_FLOOR = 0.65;

export type WeakConceptRow = {
  conceptId: string;
  conceptName: string;
  masteryScore: number;
  lastPracticedAt: string | null;
  commonMistakes: string[];
};

export type RevisionTier = "reviewNow" | "reviewSoon" | "onWatch";

export type RevisionQueueItem = {
  conceptId: string;
  conceptName: string;
  /** 0-1, raw current mastery. */
  masteryScore: number;
  /** 0-1, recency-decayed estimate -- see retention-aggregation.ts. */
  retentionScore: number;
  lastPracticedAt: string | null;
  commonMistakes: string[];
  reason: string;
  tier: RevisionTier;
};

export type RevisionQueue = {
  reviewNow: RevisionQueueItem[];
  reviewSoon: RevisionQueueItem[];
  onWatch: RevisionQueueItem[];
};

function reasonFor(tier: RevisionTier, isStruggling: boolean): string {
  if (tier === "onWatch") return "Scheduled reinforcement";
  if (isStruggling) return "Struggling with related questions";
  return "Retention declining";
}

export function buildRevisionQueue(rows: WeakConceptRow[], now: Date = new Date()): RevisionQueue {
  const queue: RevisionQueue = { reviewNow: [], reviewSoon: [], onWatch: [] };

  for (const row of rows) {
    const strength = deriveStrength(row.masteryScore);
    const retentionScore = deriveRetention(row.masteryScore, row.lastPracticedAt, now);
    const retentionStatus = classifyRetention(retentionScore);

    let tier: RevisionTier | null = null;
    if (strength === "weak" || retentionStatus === "review") {
      tier = "reviewNow";
    } else if (retentionStatus === "fading") {
      tier = retentionScore < ON_WATCH_RETENTION_FLOOR ? "reviewSoon" : "onWatch";
    }
    // A concept with "strong" retention needs nothing right now -- excluded entirely.
    if (tier === null) continue;

    const item: RevisionQueueItem = {
      conceptId: row.conceptId,
      conceptName: row.conceptName,
      masteryScore: row.masteryScore,
      retentionScore,
      lastPracticedAt: row.lastPracticedAt,
      commonMistakes: row.commonMistakes,
      reason: reasonFor(tier, strength === "weak"),
      tier,
    };
    queue[tier].push(item);
  }

  for (const tier of ["reviewNow", "reviewSoon", "onWatch"] as const) {
    queue[tier].sort((a, b) => {
      if (a.retentionScore !== b.retentionScore) return a.retentionScore - b.retentionScore;
      const aTime = a.lastPracticedAt ? new Date(a.lastPracticedAt).getTime() : 0;
      const bTime = b.lastPracticedAt ? new Date(b.lastPracticedAt).getTime() : 0;
      return aTime - bTime;
    });
  }

  return queue;
}
