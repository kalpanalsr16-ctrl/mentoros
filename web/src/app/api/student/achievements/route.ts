import { createClient } from "@/lib/supabase/server";
import { getAchievementsData } from "@/lib/achievements/get-achievements-data";

/**
 * Read-only streak + earned-milestones view (Epic F7) -- calls no agent.
 * Query/shaping logic lives in getAchievementsData() (lib/achievements/),
 * shared with app/app/achievements/page.tsx's own server-side render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const achievementsData = await getAchievementsData(supabase, studentId);

  if (!achievementsData) {
    return Response.json({ error: "Could not load your achievements." }, { status: 500 });
  }

  return Response.json(achievementsData);
}
