import { LOW_MASTERY_THRESHOLD } from "@/lib/learner/postgres-learner-state-provider";
import { HIGH_MASTERY_THRESHOLD } from "@/lib/agents/planning-agent";

/**
 * Pure aggregation for Class Overview (Epic G3) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Class Overview section: "aggregate view of one
 * class's mastery distribution." Same DB-free, unit-testable split as
 * every other *-aggregation.ts module. Reuses LOW_MASTERY_THRESHOLD/
 * HIGH_MASTERY_THRESHOLD as-is -- no new thresholds invented.
 */

export type MasteryRow = {
  studentId: string;
  conceptId: string;
  conceptName: string;
  masteryScore: number;
};

export type StudentSummary = {
  studentId: string;
  studentName: string;
  /** null = no mastery rows at all yet -- "not started," never treated as at-risk. */
  avgMastery: number | null;
  conceptsAttempted: number;
  atRisk: boolean;
};

export type ConceptStruggle = {
  conceptId: string;
  conceptName: string;
  avgMastery: number;
  studentCount: number;
};

export type ClassOverviewSummary = {
  students: StudentSummary[];
  strugglingConcepts: ConceptStruggle[];
  classAvgMastery: number | null;
  atRiskCount: number;
};

const STRUGGLING_CONCEPTS_CAP = 5;
/** A student is at-risk with 2+ individually-weak concepts even if their overall average isn't below the line yet -- catches early, concentrated struggle. */
const AT_RISK_WEAK_CONCEPT_COUNT = 2;

/**
 * The one "needs attention" rule, shared by Class Overview's roster flag
 * and Student Overview's banner (imported there, never redefined) so the
 * two screens can never disagree about who's at risk.
 */
export function computeAtRisk(rows: { masteryScore: number }[]): boolean {
  if (rows.length === 0) return false;
  const avgMastery = rows.reduce((sum, r) => sum + r.masteryScore, 0) / rows.length;
  const weakCount = rows.filter((r) => r.masteryScore < LOW_MASTERY_THRESHOLD).length;
  return avgMastery < LOW_MASTERY_THRESHOLD || weakCount >= AT_RISK_WEAK_CONCEPT_COUNT;
}

export function summarizeStudent(
  studentId: string,
  studentName: string,
  masteryRows: MasteryRow[],
): StudentSummary {
  const own = masteryRows.filter((r) => r.studentId === studentId);
  if (own.length === 0) {
    return { studentId, studentName, avgMastery: null, conceptsAttempted: 0, atRisk: false };
  }
  const avgMastery = own.reduce((sum, r) => sum + r.masteryScore, 0) / own.length;
  return {
    studentId,
    studentName,
    avgMastery,
    conceptsAttempted: own.length,
    atRisk: computeAtRisk(own),
  };
}

/** at-risk first (weakest-average first among them), then not-started, then everyone else weakest-first -- mirrors Progress page's "weak concepts surfaced first" precedent, extended to a roster. */
function rosterPriority(s: StudentSummary): number {
  if (s.atRisk) return 0;
  if (s.avgMastery === null) return 1;
  return 2;
}

export function computeStrugglingConcepts(masteryRows: MasteryRow[]): ConceptStruggle[] {
  const byConcept = new Map<string, { conceptName: string; scores: number[] }>();
  for (const row of masteryRows) {
    if (!byConcept.has(row.conceptId)) {
      byConcept.set(row.conceptId, { conceptName: row.conceptName, scores: [] });
    }
    byConcept.get(row.conceptId)!.scores.push(row.masteryScore);
  }

  return [...byConcept.entries()]
    .map(([conceptId, { conceptName, scores }]) => ({
      conceptId,
      conceptName,
      avgMastery: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      studentCount: scores.length,
    }))
    .filter((c) => c.avgMastery < HIGH_MASTERY_THRESHOLD)
    .sort((a, b) => a.avgMastery - b.avgMastery)
    .slice(0, STRUGGLING_CONCEPTS_CAP);
}

export function buildClassOverview(
  roster: { studentId: string; studentName: string }[],
  masteryRows: MasteryRow[],
): ClassOverviewSummary {
  const students = roster
    .map((s) => summarizeStudent(s.studentId, s.studentName, masteryRows))
    .sort((a, b) => {
      const priorityDiff = rosterPriority(a) - rosterPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.avgMastery ?? 0) - (b.avgMastery ?? 0);
    });

  const started = students.filter((s) => s.avgMastery !== null);
  const classAvgMastery =
    started.length > 0 ? started.reduce((sum, s) => sum + (s.avgMastery ?? 0), 0) / started.length : null;

  return {
    students,
    strugglingConcepts: computeStrugglingConcepts(masteryRows),
    classAvgMastery,
    atRiskCount: students.filter((s) => s.atRisk).length,
  };
}
