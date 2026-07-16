import { LOW_MASTERY_THRESHOLD } from "@/lib/learner/postgres-learner-state-provider";

/**
 * Pure aggregation logic for GET /api/student/dashboard (Sprint 5, Epic
 * F2), split out from the route the same way buildTraceView/
 * buildObservabilityReport are -- no Supabase dependency, directly
 * unit-testable with hand-built rows.
 */

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * "Streak count itself IS derived at read time from messages.created_at
 * grouped by day -- no new table needed" (docs/ui-architecture/
 * 02_Student_Experience.md's Achievements section, reused here for the
 * Dashboard's streak stat). Counts consecutive active days ending at
 * today OR yesterday -- a day without activity yet doesn't zero out a
 * streak that's still within its grace period, but two missed days does.
 */
export function computeStreak(activeMessageDates: Date[], today: Date = new Date()): number {
  const activeDayKeys = new Set(activeMessageDates.map(toDateKey));

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  let cursor: Date;
  if (activeDayKeys.has(toDateKey(today))) {
    cursor = today;
  } else if (activeDayKeys.has(toDateKey(yesterday))) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (activeDayKeys.has(toDateKey(cursor))) {
    streak += 1;
    const previous = new Date(cursor);
    previous.setUTCDate(previous.getUTCDate() - 1);
    cursor = previous;
  }
  return streak;
}

export type MasteryRow = {
  conceptId: string;
  conceptName: string;
  masteryScore: number;
  lastPracticedAt: string | null;
};

/**
 * "One revision suggestion" (docs/ui-architecture/02_Student_Experience.md's
 * Dashboard section) -- doesn't depend on the not-yet-built
 * `revision_schedule` table (Epic F6, its own future sprint). Reuses the
 * same LOW_MASTERY_THRESHOLD Planning Agent and PostgresLearnerStateProvider
 * already use for "weak concept," rather than inventing a second
 * definition. Null when nothing qualifies -- a genuinely positive state
 * (nothing weak to suggest), not an error.
 */
export function pickRevisionSuggestion(rows: MasteryRow[]): MasteryRow | null {
  const weak = rows.filter((r) => r.masteryScore < LOW_MASTERY_THRESHOLD);
  if (weak.length === 0) return null;
  return weak.reduce((lowest, r) => (r.masteryScore < lowest.masteryScore ? r : lowest));
}

/**
 * "Mastery snapshot (2-3 concepts)" -- the doc doesn't specify which, so
 * this shows the most recently practiced ones ("here's where you left
 * off"), the most actionable reading given the alternative (arbitrary
 * order, or highest mastery, which would just repeat what the student
 * already knows well).
 */
export function pickRecentConcepts(rows: MasteryRow[], limit = 3): MasteryRow[] {
  return [...rows]
    .filter((r) => r.lastPracticedAt !== null)
    .sort((a, b) => new Date(b.lastPracticedAt!).getTime() - new Date(a.lastPracticedAt!).getTime())
    .slice(0, limit);
}
