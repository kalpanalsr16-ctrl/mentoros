import { createClient } from "@/lib/supabase/server";
import { getProgressData } from "@/lib/progress/get-progress-data";

/**
 * Read-only mastery-by-concept aggregation (Sprint 6, Epic F4) -- reads
 * Memory Agent's *output*, never calls any agent. Query/shaping logic
 * lives in getProgressData() (lib/progress/), shared with
 * app/progress/page.tsx's own server-side render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const progressData = await getProgressData(supabase, studentId);

  if (!progressData) {
    return Response.json({ error: "Could not load your progress." }, { status: 500 });
  }

  return Response.json(progressData);
}
