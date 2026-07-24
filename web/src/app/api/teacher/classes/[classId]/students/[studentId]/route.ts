import { removeStudentFromClass } from "@/lib/teacher-roster/manage-roster";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/** Removes a student from a teacher's own class roster -- see students/route.ts's note on scope. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string; studentId: string }> },
) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { classId, studentId } = await params;

  const { data: classRow } = await auth.supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", auth.teacherId)
    .maybeSingle();
  if (!classRow) {
    return Response.json({ error: "That's not one of your classes." }, { status: 403 });
  }

  const result = await removeStudentFromClass(auth.supabase, classId, studentId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ success: true });
}
