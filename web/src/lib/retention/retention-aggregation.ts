/**
 * Knowledge Retention (My Learning enhancement). learner_concept_mastery
 * stores exactly one current mastery_score per concept -- no history, no
 * decay signal, no "last tested vs. now" model. Retention here is a
 * transparent, documented heuristic derived from two fields that DO
 * exist (mastery_score, last_practiced_at), not a measured
 * spaced-repetition/forgetting-curve result: the longer it's been since
 * a concept was last practiced, the less confidently we treat its
 * current mastery_score as still-true-today. This is explicitly a
 * recency-decay estimate, disclosed as such in the My Learning UI copy
 * and in the feature's final report -- not presented as a scientifically
 * measured memory test.
 */

const DECAY_WINDOW_DAYS = 60;
const MIN_RETENTION_FACTOR = 0.5;

export const RETENTION_STRONG_THRESHOLD = 0.8;
export const RETENTION_FADING_THRESHOLD = 0.5;

export type RetentionClassification = "strong" | "fading" | "review";

export function daysBetween(from: string | Date, to: Date): number {
  const fromMs = typeof from === "string" ? new Date(from).getTime() : from.getTime();
  return Math.max(0, (to.getTime() - fromMs) / (24 * 60 * 60 * 1000));
}

/**
 * masteryScore is 0-1. Returns 0-1. A concept practiced within the last
 * few days keeps its full mastery score; one untouched for
 * DECAY_WINDOW_DAYS+ is discounted down to (but never below)
 * MIN_RETENTION_FACTOR of its mastery score -- retention degrades, it
 * never implies total forgetting.
 */
export function deriveRetention(masteryScore: number, lastPracticedAt: string | null, now: Date = new Date()): number {
  if (lastPracticedAt === null) return masteryScore;
  const days = daysBetween(lastPracticedAt, now);
  const recencyFactor = Math.max(MIN_RETENTION_FACTOR, 1 - days / DECAY_WINDOW_DAYS);
  return masteryScore * recencyFactor;
}

export function classifyRetention(retentionScore: number): RetentionClassification {
  if (retentionScore < RETENTION_FADING_THRESHOLD) return "review";
  if (retentionScore < RETENTION_STRONG_THRESHOLD) return "fading";
  return "strong";
}

export type RetentionAssessmentEvent = {
  conceptId: string;
  masteryScore: number; // 0-100, matches assessment_completed's own scale
  createdAt: string;
};

export type RetentionWeekBucket = {
  weekStart: string;
  averageScore: number; // 0-100
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Reconstructs a weekly retention trend on demand from assessment_completed
 * events -- the same no-new-table approach buildWeeklySummary
 * (parent-portal) already uses, since learner_concept_mastery itself has
 * no history to read a trend from. Buckets are calendar-relative to `now`
 * (this week, last week, ...), oldest first. Only buckets that actually
 * contain at least one event are returned -- a real account with only a
 * few days of history will often get back 0 or 1 buckets, and the UI is
 * expected to hide the trend chart in that case rather than draw a line
 * through fabricated points.
 */
export function buildRetentionTrend(events: RetentionAssessmentEvent[], now: Date = new Date(), weeks = 3): RetentionWeekBucket[] {
  const buckets: { weekStart: Date; scores: number[] }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * WEEK_MS);
    buckets.push({ weekStart, scores: [] });
  }

  for (const event of events) {
    const eventTime = new Date(event.createdAt).getTime();
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      const bucketEnd = i === buckets.length - 1 ? now.getTime() : buckets[i + 1].weekStart.getTime();
      if (eventTime >= bucket.weekStart.getTime() && eventTime < bucketEnd) {
        bucket.scores.push(event.masteryScore);
        break;
      }
    }
  }

  return buckets
    .filter((bucket) => bucket.scores.length > 0)
    .map((bucket) => ({
      weekStart: bucket.weekStart.toISOString(),
      averageScore: Math.round(bucket.scores.reduce((sum, s) => sum + s, 0) / bucket.scores.length),
    }));
}
