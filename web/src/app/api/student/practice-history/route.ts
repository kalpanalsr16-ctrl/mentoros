import { createClient } from "@/lib/supabase/server";
import { getPracticeHistoryData } from "@/lib/practice-history/get-practice-history";

/**
 * Read-only history of past practice sets (Epic F5) -- reads Practice
 * Agent's past output via the `events` audit log, never calls the agent
 * itself. Query/shaping logic lives in getPracticeHistoryData()
 * (lib/practice-history/), shared with app/practice/page.tsx's own
 * server-side render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const practiceHistoryData = await getPracticeHistoryData(supabase, studentId);

  if (!practiceHistoryData) {
    return Response.json({ error: "Could not load your practice history." }, { status: 500 });
  }

  return Response.json(practiceHistoryData);
}
