import type { AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";

const WINDOW_DAYS = 7;
const MAX_BULLETS = 3;
const NO_ACTIVITY_BULLET = "No practice activity this week.";

type ConceptWindow = {
  conceptName: string;
  practiceCount: number;
  beforeScore: number;
  afterScore: number;
};

/**
 * "The single most important artifact this portal produces -- a
 * plain-language weekly digest... 3-4 short bullet-style highlights"
 * (04_Parent_Portal.md). learner_concept_mastery has no history (only
 * the current score), so -- same constraint G11's Progress Analytics
 * trend already worked around -- this derives "improved from X% to Y%"
 * from assessment_completed events themselves: the oldest and newest
 * score for each concept practiced within the last 7 days. Computed
 * on-demand at request time (the doc leaves scheduled-vs-on-request
 * unresolved; this app has no scheduled-job infrastructure anywhere
 * else, so on-demand is the consistent choice).
 *
 * `items` is expected pre-sorted newest-first, matching
 * getAssessmentHistoryData's own query order -- reused directly rather
 * than a new query, so "before" is a concept's oldest event *within the
 * window*, not literally "at the start of the week" if there's a gap;
 * an honest approximation from the only data that exists, same as G11.
 */
export function buildWeeklySummary(items: AssessmentHistoryItem[], now: Date = new Date()): string[] {
  const windowStart = now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const withinWindow = items.filter((item) => new Date(item.createdAt).getTime() >= windowStart);

  if (withinWindow.length === 0) {
    return [NO_ACTIVITY_BULLET];
  }

  const byConcept = new Map<string, AssessmentHistoryItem[]>();
  for (const item of withinWindow) {
    const list = byConcept.get(item.conceptName) ?? [];
    list.push(item);
    byConcept.set(item.conceptName, list);
  }

  const conceptWindows: ConceptWindow[] = [...byConcept.entries()].map(([conceptName, conceptItems]) => ({
    conceptName,
    practiceCount: conceptItems.length,
    // conceptItems is still newest-first: [0] is the most recent score, the last element is the oldest in-window score.
    afterScore: conceptItems[0].report.masteryScore,
    beforeScore: conceptItems[conceptItems.length - 1].report.masteryScore,
  }));

  return conceptWindows
    .sort((a, b) => b.practiceCount - a.practiceCount)
    .slice(0, MAX_BULLETS)
    .map((c) => formatBullet(c));
}

function formatBullet(c: ConceptWindow): string {
  const times = c.practiceCount === 1 ? "1 time" : `${c.practiceCount} times`;
  const trend =
    c.afterScore > c.beforeScore
      ? `improved from ${c.beforeScore}% to ${c.afterScore}% mastery`
      : c.afterScore < c.beforeScore
        ? `dipped from ${c.beforeScore}% to ${c.afterScore}% mastery`
        : `is holding steady at ${c.afterScore}% mastery`;
  return `Practiced ${c.conceptName} ${times} this week and ${trend}.`;
}
