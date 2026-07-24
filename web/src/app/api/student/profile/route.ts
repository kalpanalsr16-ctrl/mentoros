import { createClient } from "@/lib/supabase/server";
import { getProfileData } from "@/lib/profile/get-profile-data";
import { buildProfileUpdate } from "@/lib/profile/build-profile-update";

/**
 * Read path for the Profile screen (Epic F8) -- Onboarding (Sprint 4)
 * only ever needed the write side. Shares getProfileData() with
 * app/app/profile/page.tsx's own server-side render.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const profileData = await getProfileData(supabase, studentId);

  if (!profileData) {
    return Response.json({ error: "Could not load your profile." }, { status: 500 });
  }

  return Response.json(profileData);
}

/**
 * Onboarding's write path (Sprint 4, Epic F1) -- writes to `learner_profiles`,
 * the same M8 table Memory Agent already writes `confidence` to and
 * Planning/Personalization Agent already read `grade`/`confidence`/
 * `preferred_learning_style`/`learning_goals` from (postgres-learner-
 * state-provider.ts). No new migration, no new agent behavior: this is
 * the first UI ever writing the preference fields that table has had
 * full CRUD RLS for since M8.
 *
 * Upsert, not insert -- a student can revisit onboarding-equivalent
 * settings later (Sprint 4 scope doesn't build a settings screen, but
 * this endpoint shouldn't assume it's only ever called once). Partial
 * body: only the fields present are written, so Skip (grade only, or
 * even an empty body) never clobbers fields set by a prior call.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;
  const body = await request.json().catch(() => null);

  const result = buildProfileUpdate(studentId, body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const { error } = await supabase.from("learner_profiles").upsert(result.update);

  if (error) {
    return Response.json({ error: "Could not save your profile." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
