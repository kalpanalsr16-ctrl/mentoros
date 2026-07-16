import { createClient } from "@/lib/supabase/server";

const VALID_CONFIDENCE = ["Low", "Medium", "High"] as const;
const VALID_LEARNING_STYLE = [
  "Visual",
  "Conversational",
  "StepByStep",
  "ExampleFirst",
  "PracticeFirst",
] as const;

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

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = { id: studentId };

  if (body.grade !== undefined) {
    if (typeof body.grade !== "number" || body.grade < 1 || body.grade > 12) {
      return Response.json({ error: "grade must be a number between 1 and 12." }, { status: 400 });
    }
    update.grade = body.grade;
  }

  if (body.confidence !== undefined) {
    if (!VALID_CONFIDENCE.includes(body.confidence)) {
      return Response.json({ error: "Invalid confidence value." }, { status: 400 });
    }
    update.confidence = body.confidence;
  }

  if (body.preferredLearningStyle !== undefined) {
    if (!VALID_LEARNING_STYLE.includes(body.preferredLearningStyle)) {
      return Response.json({ error: "Invalid preferredLearningStyle value." }, { status: 400 });
    }
    update.preferred_learning_style = body.preferredLearningStyle;
  }

  if (body.learningGoals !== undefined) {
    if (!Array.isArray(body.learningGoals) || !body.learningGoals.every((g: unknown) => typeof g === "string")) {
      return Response.json({ error: "learningGoals must be an array of strings." }, { status: 400 });
    }
    update.learning_goals = body.learningGoals;
  }

  const { error } = await supabase.from("learner_profiles").upsert(update);

  if (error) {
    return Response.json({ error: "Could not save your profile." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
