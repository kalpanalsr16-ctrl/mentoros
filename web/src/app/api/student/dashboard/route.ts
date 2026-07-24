import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";

/**
 * Read-only aggregation for the Student Dashboard (Sprint 5, Epic F2) --
 * reads Memory Agent's *output* (learner_concept_mastery), never calls
 * any agent itself, per 02_Student_Experience.md's own "Agent
 * dependencies: none directly" note. The actual query/shaping logic
 * lives in getDashboardData() (lib/dashboard/), shared with app/page.tsx's
 * own server-side render rather than duplicated here.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const dashboardData = await getDashboardData(supabase, studentId);

  if (!dashboardData) {
    return Response.json({ degraded: true });
  }

  return Response.json(dashboardData);
}
