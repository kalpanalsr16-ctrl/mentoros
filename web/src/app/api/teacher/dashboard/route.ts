import { createClient } from "@/lib/supabase/server";
import { getTeacherDashboardData } from "@/lib/teacher-dashboard/get-teacher-dashboard-data";

/**
 * Studio Dashboard (Epic G2) -- per 10_API_Contracts.md's Teacher
 * endpoints section: `GET /api/teacher/dashboard` requires `role =
 * 'teacher'` in addition to being signed in. Calls no agent.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const teacherId = claimsData.claims.sub as string;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", teacherId).single();

  if (profile?.role !== "teacher") {
    return Response.json({ error: "Teacher access required." }, { status: 403 });
  }

  const dashboardData = await getTeacherDashboardData(supabase, teacherId);

  if (!dashboardData) {
    return Response.json({ error: "Could not load your dashboard." }, { status: 500 });
  }

  return Response.json(dashboardData);
}
