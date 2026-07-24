import { createClient } from "@/lib/supabase/server";
import { getAssessmentHistoryData } from "@/lib/assessment-history/get-assessment-history";

/**
 * Read-only history of past assessment feedback (Epic F5) -- reads
 * Assessment Agent's past output via the `events` audit log, never calls
 * the agent itself. Query/shaping logic lives in
 * getAssessmentHistoryData() (lib/assessment-history/), shared with
 * app/assessment/page.tsx's own server-side render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const assessmentHistoryData = await getAssessmentHistoryData(supabase, studentId);

  if (!assessmentHistoryData) {
    return Response.json({ error: "Could not load your assessment history." }, { status: 500 });
  }

  return Response.json(assessmentHistoryData);
}
