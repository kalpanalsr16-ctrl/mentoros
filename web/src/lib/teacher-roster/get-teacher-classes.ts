import type { createClient } from "@/lib/supabase/server";
import { computeAtRisk } from "@/lib/teacher-roster/roster-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type TeacherClassSummary = {
  id: string;
  name: string;
  grade: number | null;
  studentCount: number;
  avgMastery: number | null;
  atRiskCount: number;
};

/**
 * `/studio/classes` list (Epic G3) -- docs/ui-architecture/10_API_Contracts.md's
 * `GET /api/teacher/classes`. Deliberately omits `classCode`: the contract
 * names the field, but no student-facing join endpoint, invite lifecycle,
 * verification flow, or corresponding RLS exists (see the note on
 * `createClass` below) -- adding an unused code column now would just be
 * dead schema ahead of a decision that hasn't been made.
 */
export async function listTeacherClasses(
  supabase: SupabaseServerClient,
  teacherId: string,
): Promise<TeacherClassSummary[] | null> {
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, grade")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (classesError) return null;
  if (!classes || classes.length === 0) return [];

  const classIds = classes.map((c) => c.id);
  const { data: rosterRows, error: rosterError } = await supabase
    .from("class_students")
    .select("class_id, student_id")
    .in("class_id", classIds);

  if (rosterError) return null;

  const studentIdsByClass = new Map<string, string[]>();
  for (const row of rosterRows ?? []) {
    const list = studentIdsByClass.get(row.class_id) ?? [];
    list.push(row.student_id);
    studentIdsByClass.set(row.class_id, list);
  }

  const allStudentIds = [...new Set((rosterRows ?? []).map((r) => r.student_id))];
  const { data: masteryRows, error: masteryError } =
    allStudentIds.length > 0
      ? await supabase.from("learner_concept_mastery").select("student_id, mastery_score").in("student_id", allStudentIds)
      : { data: [], error: null };

  if (masteryError) return null;

  const masteryByStudent = new Map<string, number[]>();
  for (const row of masteryRows ?? []) {
    const list = masteryByStudent.get(row.student_id) ?? [];
    list.push(Number(row.mastery_score));
    masteryByStudent.set(row.student_id, list);
  }

  return classes.map((c) => {
    const studentIds = studentIdsByClass.get(c.id) ?? [];
    const scoresByStudent = studentIds.map((id) => masteryByStudent.get(id) ?? []);
    const startedAverages = scoresByStudent
      .filter((scores) => scores.length > 0)
      .map((scores) => scores.reduce((sum, s) => sum + s, 0) / scores.length);

    // Same computeAtRisk rule Class Overview's roster and Student Overview's
    // banner use -- a class-list summary can never disagree with the detail
    // screens about who's at risk.
    const atRiskCount = scoresByStudent.filter((scores) => computeAtRisk(scores.map((s) => ({ masteryScore: s })))).length;
    const avgMastery =
      startedAverages.length > 0 ? startedAverages.reduce((sum, a) => sum + a, 0) / startedAverages.length : null;

    return {
      id: c.id,
      name: c.name,
      grade: c.grade,
      studentCount: studentIds.length,
      avgMastery,
      atRiskCount,
    };
  });
}

export type CreateClassInput = { name: string; grade?: number | null };

export async function createClass(
  supabase: SupabaseServerClient,
  teacherId: string,
  input: CreateClassInput,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("classes")
    .insert({ teacher_id: teacherId, name: input.name, grade: input.grade ?? null })
    .select("id")
    .single();

  if (error || !data) return null;
  return { id: data.id };
}
