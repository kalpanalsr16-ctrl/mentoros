import type { createClient } from "@/lib/supabase/server";
import { buildActivityFeed, type ActivityEventRow, type ActivityItem } from "@/lib/teacher-dashboard/teacher-dashboard-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type TeacherDashboardData = {
  classCount: number;
  studentCount: number;
  activity: ActivityItem[];
};

/**
 * Studio Dashboard (Epic G2) -- docs/ui-architecture/03_Teacher_Studio.md's
 * Dashboard section: StatTile row (classes, students, recent activity)
 * plus an activity feed. `events`/`profiles` reads below rely entirely on
 * the teacher-scoped RLS policies added in 0012_events_teacher_read.sql/
 * 0013_profiles_teacher_read.sql -- no explicit student-id filter is
 * needed in these queries, RLS already limits every row to students in
 * this teacher's own classes.
 */
export async function getTeacherDashboardData(
  supabase: SupabaseServerClient,
  teacherId: string,
): Promise<TeacherDashboardData | null> {
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", teacherId);

  if (classesError) {
    return null;
  }

  const classIds = (classes ?? []).map((c) => c.id);

  const { data: rosterRows, error: rosterError } =
    classIds.length > 0
      ? await supabase.from("class_students").select("student_id").in("class_id", classIds)
      : { data: [], error: null };

  if (rosterError) {
    return null;
  }

  const studentIds = [...new Set((rosterRows ?? []).map((r) => r.student_id))];

  const { data: eventRows, error: eventsError } = await supabase
    .from("events")
    .select("id, event_name, payload, created_at, student_id")
    .in("event_name", ["concept_explained", "practice_generated", "assessment_completed"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (eventsError) {
    return null;
  }

  const { data: profileRows, error: profilesError } =
    studentIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", studentIds)
      : { data: [], error: null };

  if (profilesError) {
    return null;
  }

  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name ?? "A student"]));

  const activityRows: ActivityEventRow[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    eventName: e.event_name,
    payload: e.payload as Record<string, unknown>,
    createdAt: e.created_at,
    studentName: nameById.get(e.student_id ?? "") ?? "A student",
  }));

  return {
    classCount: classIds.length,
    studentCount: studentIds.length,
    activity: buildActivityFeed(activityRows),
  };
}
