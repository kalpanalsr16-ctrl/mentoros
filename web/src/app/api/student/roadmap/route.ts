import { createClient } from "@/lib/supabase/server";
import { getRoadmapData } from "@/lib/roadmap/get-roadmap-data";

/**
 * Read-only curriculum path (Epic F3) -- reads the published curriculum
 * graph plus this student's own mastery rows; calls no agent. Query/
 * shaping logic lives in getRoadmapData()/buildRoadmap()
 * (lib/roadmap/), shared with app/app/roadmap/page.tsx's own
 * server-side render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const roadmapData = await getRoadmapData(supabase, studentId);

  if (!roadmapData) {
    return Response.json({ error: "Could not load your roadmap." }, { status: 500 });
  }

  return Response.json(roadmapData);
}
