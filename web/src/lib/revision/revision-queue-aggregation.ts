import { deriveStrength } from "@/lib/progress/progress-aggregation";

/**
 * Revision Queue (learner UI redesign) -- replaces revision_schedule as
 * the data source (that table has zero writers anywhere in this
 * codebase; every account would see a permanently empty page). This
 * derives "what to revisit now" directly from real, live
 * learner_concept_mastery rows: any concept currently below
 * LOW_MASTERY_THRESHOLD, weakest first. No due dates are invented --
 * there is no real scheduling data, so items render without one (see
 * the page component). `upcoming` is kept in the type only so a real
 * future scheduler can populate it without a shape change; nothing
 * populates it today.
 */
export type WeakConceptRow = {
  conceptId: string;
  conceptName: string;
  masteryScore: number;
  lastPracticedAt: string | null;
};

export type RevisionQueueItem = WeakConceptRow;

export type RevisionQueue = {
  dueNow: RevisionQueueItem[];
  upcoming: RevisionQueueItem[];
};

export function buildRevisionQueue(rows: WeakConceptRow[]): RevisionQueue {
  const weak = rows.filter((r) => deriveStrength(r.masteryScore) === "weak");

  weak.sort((a, b) => {
    if (a.masteryScore !== b.masteryScore) return a.masteryScore - b.masteryScore;
    const aTime = a.lastPracticedAt ? new Date(a.lastPracticedAt).getTime() : 0;
    const bTime = b.lastPracticedAt ? new Date(b.lastPracticedAt).getTime() : 0;
    return aTime - bTime;
  });

  return { dueNow: weak, upcoming: [] };
}
