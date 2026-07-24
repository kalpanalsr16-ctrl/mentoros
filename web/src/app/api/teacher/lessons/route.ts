import { listLessons } from "@/lib/teacher-lessons/list-lessons";
import { createLesson } from "@/lib/teacher-lessons/create-lesson";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/lessons` (Epic G8) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET/POST /api/teacher/lessons`. `?classId=`
 * is an additive filter, not in the doc's contract row but consistent
 * with its own general query-param conventions elsewhere.
 */
export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const classId = new URL(request.url).searchParams.get("classId") ?? undefined;
  const lessons = await listLessons(auth.supabase, auth.teacherId, classId);
  if (!lessons) {
    return Response.json({ error: "Couldn't load your lesson plans." }, { status: 500 });
  }
  return Response.json({ lessons });
}

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const classId = typeof body?.classId === "string" ? body.classId : "";
  const grade = typeof body?.grade === "number" ? body.grade : null;
  const subject = typeof body?.subject === "string" ? body.subject : null;
  const conceptId = typeof body?.conceptId === "string" ? body.conceptId : null;

  const result = await createLesson(auth.supabase, auth.teacherId, { title, classId, grade, subject, conceptId });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ id: result.id });
}
