export type RevisionRow = {
  id: string;
  conceptId: string;
  conceptName: string;
  dueAt: string;
};

export type RevisionItem = RevisionRow;

export type RevisionGroups = {
  dueNow: RevisionItem[];
  upcoming: RevisionItem[];
};

/**
 * Splits revision_schedule rows into "due now" (due_at <= now) and
 * "upcoming" (due_at in the future), each sorted soonest-first -- Epic
 * F6's "due-now items first, upcoming items after"
 * (02_Student_Experience.md). Pure so it's testable without a real clock
 * or a Supabase client, same split as every other *-aggregation.ts module
 * in this codebase.
 */
export function groupRevisionItems(rows: RevisionRow[], now: Date = new Date()): RevisionGroups {
  const sorted = [...rows].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const dueNow = sorted.filter((r) => new Date(r.dueAt).getTime() <= now.getTime());
  const upcoming = sorted.filter((r) => new Date(r.dueAt).getTime() > now.getTime());
  return { dueNow, upcoming };
}
