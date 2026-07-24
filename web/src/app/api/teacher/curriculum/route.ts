import { createPostgresCurriculumProvider } from "@/lib/curriculum/postgres-curriculum-provider";
import { requireTeacher } from "@/lib/teacher-roster/require-teacher";

/**
 * `/studio/curriculum` (Epic G6, Postgres portion only) --
 * docs/ui-architecture/10_API_Contracts.md's `GET /api/teacher/curriculum
 * ?source=postgres|learning-commons&q=`. Only `source=postgres` is wired
 * up -- `LearningCommonsCurriculumProvider` doesn't exist yet (blocked on
 * the API key, per 13_Implementation_Sequence.md's G6/G7 dependency),
 * and this route says so honestly rather than silently no-op-ing.
 */
export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const source = url.searchParams.get("source") ?? "postgres";
  const query = url.searchParams.get("q") ?? "";

  if (source === "learning-commons") {
    return Response.json(
      { error: "Learning Commons isn't connected yet. Browsing MentorOS's own curriculum is available now." },
      { status: 501 },
    );
  }

  if (source !== "postgres") {
    return Response.json({ error: "Unknown curriculum source." }, { status: 400 });
  }

  const provider = createPostgresCurriculumProvider(auth.supabase);
  const results = await provider.search(query);

  return Response.json({ results });
}
