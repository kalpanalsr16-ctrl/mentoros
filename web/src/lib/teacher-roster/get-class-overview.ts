import type { createClient } from "@/lib/supabase/server";
import { buildClassOverview, type ClassOverviewSummary, type MasteryRow } from "@/lib/teacher-roster/roster-aggregation";
import { buildActivityFeed, type ActivityEventRow, type ActivityItem } from "@/lib/teacher-dashboard/teacher-dashboard-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ClassOverviewData = ClassOverviewSummary & {
  className: string;
  activity: ActivityItem[];
};

export type ClassOverviewResult =
  | { status: "ok"; data: ClassOverviewData }
  | { status: "error" }
  | { status: "forbidden" };

/**
 * `/studio/classes/:classId` (Epic G3) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Class Overview section.
 *
 * No separate 404 here, deliberately: `classes`' own SELECT policy
 * (0011_classes.sql) only ever returns a teacher's own rows, so a query
 * for someone else's classId and a query for a classId that plain
 * doesn't exist are indistinguishable at this layer -- both return zero
 * rows. Collapsing both into a single 403 is not just the only option
 * RLS leaves open, it's the safer one: it never confirms or denies that
 * a given id exists at all to a teacher who doesn't own it.
 */
export async function getClassOverview(
  supabase: SupabaseServerClient,
  teacherId: string,
  classId: string,
): Promise<ClassOverviewResult> {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, name, teacher_id")
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

  const { data: profileRows, error: profilesError } =
    studentIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", studentIds)
      : { data: [], error: null };

  if (profilesError) return { status: "error" };

  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name ?? "A student"]));

  const { data: masteryRows, error: masteryError } =
    studentIds.length > 0
      ? await supabase.from("learner_concept_mastery").select("student_id, concept_id, mastery_score").in("student_id", studentIds)
      : { data: [], error: null };

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

  const roster = studentIds.map((id) => ({ studentId: id, studentName: nameById.get(id) ?? "A student" }));
  const overview = buildClassOverview(roster, flatMasteryRows);

  const { data: eventRows, error: eventsError } =
    studentIds.length > 0
      ? await supabase
          .from("events")
          .select("id, event_name, payload, created_at, student_id")
          .in("student_id", studentIds)
          .in("event_name", ["concept_explained", "practice_generated", "assessment_completed"])
          .order("created_at", { ascending: false })
          .limit(10)
      : { data: [], error: null };

  if (eventsError) return { status: "error" };

  const activityRows: ActivityEventRow[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    eventName: e.event_name,
    payload: e.payload as Record<string, unknown>,
    createdAt: e.created_at,
    studentName: nameById.get(e.student_id ?? "") ?? "A student",
  }));

  return {
    status: "ok",
    data: { ...overview, className: classRow.name, activity: buildActivityFeed(activityRows) },
  };
}
