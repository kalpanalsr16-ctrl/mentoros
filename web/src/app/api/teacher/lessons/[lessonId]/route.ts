import { getLesson } from "@/lib/teacher-lessons/get-lesson";
import { updateLesson } from "@/lib/teacher-lessons/update-lesson";
import { deleteLesson } from "@/lib/teacher-lessons/delete-lesson";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/lessons/:lessonId` -- docs/ui-architecture/10_API_Contracts.md's
 * `GET/PATCH /api/teacher/lessons/:id`. DELETE isn't in that contract
 * row (same gap Assessment Builder's route had), added for the same
 * reason: a draft with no downstream data needs a way to go away.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { lessonId } = await params;
  const lesson = await getLesson(auth.supabase, auth.teacherId, lessonId);

  if (!lesson) {
    return Response.json({ error: "That's not one of your lesson plans." }, { status: 404 });
  }
  return Response.json({ lesson });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { lessonId } = await params;
  const body = await request.json().catch(() => null);

  const result = await updateLesson(auth.supabase, auth.teacherId, lessonId, {
    title: typeof body?.title === "string" ? body.title.trim() : "",
    classId: typeof body?.classId === "string" ? body.classId : "",
    grade: typeof body?.grade === "number" ? body.grade : null,
    subject: typeof body?.subject === "string" ? body.subject : null,
    conceptId: typeof body?.conceptId === "string" ? body.conceptId : null,
    status: typeof body?.status === "string" ? body.status : "draft",
    objectives: typeof body?.objectives === "string" ? body.objectives : "",
    materials: typeof body?.materials === "string" ? body.materials : "",
    procedure: typeof body?.procedure === "string" ? body.procedure : "",
    notes: typeof body?.notes === "string" ? body.notes : "",
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const { lessonId } = await params;
  const result = await deleteLesson(auth.supabase, auth.teacherId, lessonId);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ success: true });
}
