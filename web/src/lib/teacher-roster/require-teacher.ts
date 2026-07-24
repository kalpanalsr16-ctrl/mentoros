import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type TeacherAuth = { supabase: SupabaseServerClient; teacherId: string };
export type TeacherAuthResult = TeacherAuth | { error: Response };

/**
 * Shared auth check for every Teacher Studio roster route this sprint
 * (G3/G4) -- same signed-in + `role === 'teacher'` pattern
 * /api/teacher/dashboard already established, extracted here so G3/G4's
 * five new routes don't each repeat it.
 */
export async function requireTeacher(): Promise<TeacherAuthResult> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return { error: Response.json({ error: "Not signed in." }, { status: 401 }) };
  }

  const teacherId = claimsData.claims.sub as string;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", teacherId).single();

  if (profile?.role !== "teacher") {
    return { error: Response.json({ error: "Teacher access required." }, { status: 403 }) };
  }

  return { supabase, teacherId };
}
