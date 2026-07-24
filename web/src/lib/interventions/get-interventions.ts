import type { createClient } from "@/lib/supabase/server";
import { buildInterventions, type ConceptMisconceptionEventRow, type InterventionSuggestion } from "@/lib/interventions/intervention-aggregation";
import type { MasteryRow } from "@/lib/teacher-roster/roster-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type InterventionsResult =
  | { status: "ok"; data: { className: string; suggestions: InterventionSuggestion[] } }
  | { status: "error" }
  | { status: "forbidden" };

/**
 * `/studio/interventions?classId=` (Epic G12) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/interventions`. Same
 * ownership-check shape as every other class-scoped wrapper (single
 * 403, RLS can't distinguish "doesn't exist" from "not yours").
 */
export async function getInterventions(
  supabase: SupabaseServerClient,
  teacherId: string,
  classId: string,
): Promise<InterventionsResult> {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (classError) return { status: "error" };
  if (!classRow) return { status: "forbidden" };

  const { data: rosterRows, error: rosterError } = await supabase
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId);

  if (rosterError) return { status: "error" };

  const studentIds = (rosterRows ?? []).map((r) => r.student_id);
  if (studentIds.length === 0) {
    return { status: "ok", data: { className: classRow.name, suggestions: [] } };
  }

  const { data: profileRows, error: profilesError } = await supabase.from("profiles").select("id, display_name").in("id", studentIds);
  if (profilesError) return { status: "error" };
  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name ?? "A student"]));

  const { data: masteryRows, error: masteryError } = await supabase
    .from("learner_concept_mastery")
    .select("student_id, concept_id, mastery_score")
    .in("student_id", studentIds);

  if (masteryError) return { status: "error" };

  const conceptIds = [...new Set((masteryRows ?? []).map((r) => r.concept_id))];
  const { data: conceptRows, error: conceptsError } =
    conceptIds.length > 0 ? await supabase.from("concepts").select("id, name").in("id", conceptIds) : { data: [], error: null };

  if (conceptsError) return { status: "error" };
  const conceptNameById = new Map((conceptRows ?? []).map((c) => [c.id, c.name]));

  const flatMasteryRows: MasteryRow[] = (masteryRows ?? []).map((r) => ({
    studentId: r.student_id,
    conceptId: r.concept_id,
    conceptName: conceptNameById.get(r.concept_id) ?? r.concept_id,
    masteryScore: Number(r.mastery_score),
  }));

  const { data: assessmentEvents, error: eventsError } = await supabase
    .from("events")
    .select("student_id, payload")
    .in("student_id", studentIds)
    .eq("event_name", "assessment_completed");

  if (eventsError) return { status: "error" };

  const misconceptionEventRows: ConceptMisconceptionEventRow[] = (assessmentEvents ?? [])
    .map((e) => {
      const payload = e.payload as Record<string, unknown>;
      const conceptId = typeof payload.conceptId === "string" ? payload.conceptId : null;
      const misconceptionCount = typeof payload.misconceptionCount === "number" ? payload.misconceptionCount : 0;
      return conceptId ? { studentId: e.student_id as string, conceptId, misconceptionCount } : null;
    })
    .filter((r): r is ConceptMisconceptionEventRow => r !== null);

  const roster = studentIds.map((id) => ({ studentId: id, studentName: nameById.get(id) ?? "A student" }));

  return {
    status: "ok",
    data: {
      className: classRow.name,
      suggestions: buildInterventions(roster, flatMasteryRows, misconceptionEventRows),
    },
  };
}
