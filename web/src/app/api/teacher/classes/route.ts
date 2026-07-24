import { listTeacherClasses, createClass } from "@/lib/teacher-roster/get-teacher-classes";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/classes` (Epic G3) -- docs/ui-architecture/10_API_Contracts.md's
 * `GET/POST /api/teacher/classes`.
 */
export async function GET() {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const classes = await listTeacherClasses(auth.supabase, auth.teacherId);
  if (!classes) {
    return Response.json({ error: "Couldn't load your classes." }, { status: 500 });
  }
  return Response.json({ classes });
}

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const grade = typeof body?.grade === "number" ? body.grade : null;

  if (!name) {
    return Response.json({ error: "A class name is required." }, { status: 400 });
  }

  const created = await createClass(auth.supabase, auth.teacherId, { name, grade });
  if (!created) {
    return Response.json({ error: "Couldn't create that class." }, { status: 500 });
  }
  return Response.json(created);
}
