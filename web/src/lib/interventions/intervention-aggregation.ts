import type { MasteryRow } from "@/lib/teacher-roster/roster-aggregation";
import { deriveSuggestedAction } from "@/lib/teacher-roster/student-overview-aggregation";
import type { ConceptMasteryRow } from "@/lib/progress/progress-aggregation";

/**
 * Pure aggregation for Intervention Planner (Epic G12) --
 * docs/ui-architecture/03_Teacher_Studio.md's Intervention Planner
 * section: "suggested next actions for struggling students, surfaced
 * from mastery + misconception data." No new agent, no LLM call --
 * composes three already-built, already-tested pieces (computeAtRisk/G3,
 * deriveSuggestedAction/G4, and this module's own shared-misconception
 * cross-reference) into one deterministic priority ranking, per the
 * design review's approved rule:
 *
 *   priority 0 (highest): at-risk, weakest concept is one ≥2 other
 *     students also have a misconception on
 *   priority 1: at-risk, no shared-misconception match
 *   priority 2: not started yet ("start" action from G4)
 *   (excluded): "none" action students -- nothing to surface
 */

/** A class-wide pattern worth surfacing at 2+ students -- same kind of named, tunable constant as AT_RISK_WEAK_CONCEPT_COUNT/STRUGGLING_CONCEPTS_CAP elsewhere in this codebase. */
export const SHARED_MISCONCEPTION_MIN_STUDENTS = 2;

export type ConceptMisconceptionEventRow = {
  studentId: string;
  conceptId: string;
  misconceptionCount: number;
};

/** Maps each conceptId to the set of distinct students who had at least one misconception logged on it -- the raw material for detecting a shared pattern, not yet threshold-filtered. */
export function groupStudentsByMisconceptionConcept(rows: ConceptMisconceptionEventRow[]): Map<string, Set<string>> {
  const studentsByConceptId = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.misconceptionCount === 0) continue;
    const students = studentsByConceptId.get(row.conceptId) ?? new Set<string>();
    students.add(row.studentId);
    studentsByConceptId.set(row.conceptId, students);
  }
  return studentsByConceptId;
}

export type InterventionSuggestion = {
  studentId: string;
  studentName: string;
  conceptId: string | null;
  conceptName: string | null;
  reason: string;
  priority: 0 | 1 | 2;
};

export function buildInterventions(
  roster: { studentId: string; studentName: string }[],
  masteryRows: MasteryRow[],
  misconceptionEventRows: ConceptMisconceptionEventRow[],
): InterventionSuggestion[] {
  const studentsByMisconceptionConcept = groupStudentsByMisconceptionConcept(misconceptionEventRows);

  const suggestions: InterventionSuggestion[] = [];

  for (const student of roster) {
    const ownRows: ConceptMasteryRow[] = masteryRows
      .filter((r) => r.studentId === student.studentId)
      .map((r) => ({
        conceptId: r.conceptId,
        conceptName: r.conceptName,
        chapterId: null,
        chapterTitle: "",
        chapterSequence: 0,
        masteryScore: r.masteryScore,
        strength: null,
      }));

    const action = deriveSuggestedAction(ownRows);

    if (action.type === "none") continue;

    if (action.type === "start") {
      suggestions.push({
        studentId: student.studentId,
        studentName: student.studentName,
        conceptId: null,
        conceptName: null,
        reason: "Hasn't started practicing yet.",
        priority: 2,
      });
      continue;
    }

    const sharedStudents = studentsByMisconceptionConcept.get(action.conceptId);
    const isShared = (sharedStudents?.size ?? 0) >= SHARED_MISCONCEPTION_MIN_STUDENTS;

    suggestions.push({
      studentId: student.studentId,
      studentName: student.studentName,
      conceptId: action.conceptId,
      conceptName: action.conceptName,
      reason: isShared
        ? `At risk on ${action.conceptName} -- shared with ${(sharedStudents?.size ?? 0) - 1} other student${(sharedStudents?.size ?? 0) - 1 === 1 ? "" : "s"}.`
        : `At risk on ${action.conceptName}.`,
      priority: isShared ? 0 : 1,
    });
  }

  return suggestions.sort((a, b) => a.priority - b.priority || a.studentName.localeCompare(b.studentName));
}
