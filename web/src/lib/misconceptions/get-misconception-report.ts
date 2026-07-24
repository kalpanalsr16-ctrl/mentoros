import type { createClient } from "@/lib/supabase/server";
import { aggregateMisconceptions, type MisconceptionEventRow, type MisconceptionReportItem } from "@/lib/misconceptions/misconception-report-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type MisconceptionReportResult =
  | { status: "ok"; data: { className: string; misconceptions: MisconceptionReportItem[] } }
  | { status: "error" }
  | { status: "forbidden" };

/**
 * `/studio/misconceptions?classId=` (Epic G10) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/misconceptions`. Same
 * ownership-check shape as get-class-overview.ts: `classes`' own SELECT
 * policy only ever returns a teacher's own rows, so "doesn't exist" and
 * "not yours" collapse into a single 403 here too.
 */
export async function getMisconceptionReport(
  supabase: SupabaseServerClient,
  teacherId: string,
  classId: string,
): Promise<MisconceptionReportResult> {
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
    return { status: "ok", data: { className: classRow.name, misconceptions: [] } };
  }

  const { data: profileRows, error: profilesError } = await supabase.from("profiles").select("id, display_name").in("id", studentIds);
  if (profilesError) return { status: "error" };

  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name ?? "A student"]));

  const { data: eventRows, error: eventsError } = await supabase
    .from("events")
    .select("student_id, payload")
    .in("student_id", studentIds)
    .eq("event_name", "assessment_completed");

  if (eventsError) return { status: "error" };

  const misconceptionRows: MisconceptionEventRow[] = (eventRows ?? []).map((e) => {
    const payload = e.payload as Record<string, unknown>;
    const misconceptions = Array.isArray(payload.misconceptions)
      ? payload.misconceptions.filter((item): item is string => typeof item === "string")
      : [];
    return { studentName: nameById.get(e.student_id ?? "") ?? "A student", misconceptions };
  });

  return {
    status: "ok",
    data: { className: classRow.name, misconceptions: aggregateMisconceptions(misconceptionRows) },
  };
}
