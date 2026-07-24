import type { createClient } from "@/lib/supabase/server";
import { deriveStrength, type ConceptMasteryRow } from "@/lib/progress/progress-aggregation";
import { buildStudentOverview, type StudentOverviewSummary } from "@/lib/teacher-roster/student-overview-aggregation";
import { mapAssessmentEvents, type AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const RECENT_ASSESSMENTS_LIMIT = 10;

export type StudentOverviewData = StudentOverviewSummary & {
  studentName: string;
  grade: number | null;
  recentAssessments: AssessmentHistoryItem[];
};

export type StudentOverviewResult =
  | { status: "ok"; data: StudentOverviewData }
  | { status: "error" }
  | { status: "forbidden" };

/**
 * `/studio/students/:studentId` (Epic G4) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Student Overview section. G4's stated primary
 * acceptance criterion (13_Implementation_Sequence.md) is the 403 without
 * a verified `class_students` relationship.
 *
 * No separate 404: `profiles`' teacher-read policy (0013_profiles_
 * teacher_read.sql) only makes a student's row visible to a teacher once
 * a class_students link exists, so a query for a genuinely nonexistent
 * id and a query for a real student who isn't this teacher's are
 * indistinguishable before that link is confirmed -- the link check has
 * to run first, on `class_students` (safe under its own RLS, since it
 * only ever returns rows scoped to this teacher's own classes), and the
 * profile is only fetched afterward, once RLS actually allows it.
 */
export async function getStudentOverview(
  supabase: SupabaseServerClient,
  teacherId: string,
  studentId: string,
): Promise<StudentOverviewResult> {
  const { data: teacherClasses, error: teacherClassesError } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", teacherId);

  if (teacherClassesError) return { status: "error" };

  const teacherClassIds = (teacherClasses ?? []).map((c) => c.id);
  const { data: linkRows, error: linkError } =
    teacherClassIds.length > 0
      ? await supabase.from("class_students").select("class_id").eq("student_id", studentId).in("class_id", teacherClassIds)
      : { data: [], error: null };

  if (linkError) return { status: "error" };
  if (!linkRows || linkRows.length === 0) return { status: "forbidden" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, grade, role")
    .eq("id", studentId)
    .maybeSingle();

  if (profileError || !profile) return { status: "error" };

  const { data: masteryRows, error: masteryError } = await supabase
    .from("learner_concept_mastery")
    .select("concept_id, mastery_score, common_mistakes")
    .eq("student_id", studentId);

  if (masteryError) return { status: "error" };

  const rows = masteryRows ?? [];
  const conceptIds = rows.map((r) => r.concept_id);
  const { data: concepts, error: conceptsError } =
    conceptIds.length > 0 ? await supabase.from("concepts").select("id, name, chapter_id").in("id", conceptIds) : { data: [], error: null };

  if (conceptsError) return { status: "error" };

  const chapterIds = [...new Set((concepts ?? []).map((c) => c.chapter_id).filter((id): id is string => id !== null))];
  const { data: chapters, error: chaptersError } =
    chapterIds.length > 0 ? await supabase.from("chapters").select("id, title, sequence").in("id", chapterIds) : { data: [], error: null };

  if (chaptersError) return { status: "error" };

  const conceptById = new Map((concepts ?? []).map((c) => [c.id, c]));
  const chapterById = new Map((chapters ?? []).map((c) => [c.id, c]));

  const conceptMasteryRows: ConceptMasteryRow[] = rows.map((r) => {
    const concept = conceptById.get(r.concept_id);
    const chapter = concept?.chapter_id ? chapterById.get(concept.chapter_id) : undefined;
    const masteryScore = Number(r.mastery_score);
    return {
      conceptId: r.concept_id,
      conceptName: concept?.name ?? r.concept_id,
      chapterId: concept?.chapter_id ?? null,
      chapterTitle: chapter?.title ?? "Other",
      chapterSequence: chapter?.sequence ?? Number.MAX_SAFE_INTEGER,
      masteryScore,
      strength: deriveStrength(masteryScore),
    };
  });

  const { data: assessmentEvents, error: eventsError } = await supabase
    .from("events")
    .select("id, created_at, payload")
    .eq("student_id", studentId)
    .eq("event_name", "assessment_completed")
    .order("created_at", { ascending: false })
    .limit(RECENT_ASSESSMENTS_LIMIT);

  if (eventsError) return { status: "error" };

  const recentAssessments = mapAssessmentEvents(assessmentEvents ?? []);
  const assessmentMisconceptions = recentAssessments.map((a) => a.report.misconceptions);
  const commonMistakesByConcept = rows.map((r) => r.common_mistakes ?? []);

  const overview = buildStudentOverview(conceptMasteryRows, commonMistakesByConcept, assessmentMisconceptions);

  return {
    status: "ok",
    data: {
      ...overview,
      studentName: profile.display_name ?? "A student",
      grade: profile.grade,
      recentAssessments,
    },
  };
}
