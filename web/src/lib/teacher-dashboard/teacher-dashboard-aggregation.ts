export type ActivityEventRow = {
  id: string;
  eventName: string;
  payload: Record<string, unknown>;
  createdAt: string;
  studentName: string;
};

export type ActivityItem = {
  id: string;
  studentName: string;
  description: string;
  timestamp: string;
};

/**
 * Only the three "a student did something meaningful" events are
 * activity-worthy for a teacher's feed (03_Teacher_Studio.md's Dashboard
 * section) -- not internal/system events like routing_failed or
 * llm_call_succeeded. Reuses conceptName where Epic F5 already added it
 * to practice_generated/assessment_completed's payload; concept_explained
 * never logged one, so that entry stays generic rather than guessing.
 */
const ACTIVITY_VERBS: Record<string, (payload: Record<string, unknown>) => string> = {
  concept_explained: () => "worked through a concept explanation",
  practice_generated: (p) =>
    typeof p.conceptName === "string" ? `practiced ${p.conceptName}` : "practiced a set of questions",
  assessment_completed: (p) =>
    typeof p.conceptName === "string" ? `completed an assessment on ${p.conceptName}` : "completed an assessment",
};

export function describeActivity(eventName: string, payload: Record<string, unknown>): string | null {
  const describe = ACTIVITY_VERBS[eventName];
  return describe ? describe(payload) : null;
}

/** Maps raw event rows (already teacher-scoped by RLS, already joined with a display name) into the feed's display shape. Rows with no activity-worthy description are dropped rather than shown blank. */
export function buildActivityFeed(rows: ActivityEventRow[]): ActivityItem[] {
  return rows
    .map((row) => {
      const description = describeActivity(row.eventName, row.payload);
      if (!description) return null;
      return { id: row.id, studentName: row.studentName, description, timestamp: row.createdAt };
    })
    .filter((item): item is ActivityItem => item !== null);
}
