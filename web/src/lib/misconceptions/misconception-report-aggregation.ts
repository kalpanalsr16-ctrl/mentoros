/**
 * Pure aggregation for Misconception Reports (Epic G10) --
 * docs/ui-architecture/03_Teacher_Studio.md's Misconception Reports
 * section: "aggregated misconception patterns across a class, surfacing
 * what Assessment Agent has already been capturing per-student
 * (assessmentReport.misconceptions) at a class level for the first
 * time." Source is exclusively assessment_completed events' payload --
 * not learner_concept_mastery.common_mistakes, a different field
 * already surfaced on Student Overview (G4).
 */

export type MisconceptionEventRow = {
  studentName: string;
  misconceptions: string[];
};

export type MisconceptionReportItem = {
  text: string;
  frequency: number;
  affectedStudents: string[];
};

/**
 * Groups by misconception text across the whole roster. A student
 * appearing more than once for the same misconception (multiple
 * assessments) counts once in affectedStudents but each occurrence still
 * adds to frequency -- frequency measures how often it came up,
 * affectedStudents measures how many students it came up for.
 */
export function aggregateMisconceptions(rows: MisconceptionEventRow[]): MisconceptionReportItem[] {
  const byText = new Map<string, { frequency: number; students: Set<string> }>();

  for (const row of rows) {
    for (const text of row.misconceptions) {
      if (!text) continue;
      const entry = byText.get(text) ?? { frequency: 0, students: new Set<string>() };
      entry.frequency += 1;
      entry.students.add(row.studentName);
      byText.set(text, entry);
    }
  }

  return [...byText.entries()]
    .map(([text, { frequency, students }]) => ({ text, frequency, affectedStudents: [...students] }))
    .sort((a, b) => b.frequency - a.frequency);
}
