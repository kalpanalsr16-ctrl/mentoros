import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_MESSAGES_PER_WINDOW = 10;
const WINDOW_SECONDS = 60;

export type RateLimitResult =
  | { limited: false }
  | { limited: true; count: number };

/**
 * A basic per-student rate limit for /api/chat: caps how many user
 * messages a student can send within a rolling window. Every message now
 * costs a real Claude API call (M1-04), so this exists to stop a runaway
 * client loop or scripted abuse from running up cost, not to police
 * normal interactive use -- 10 messages/minute is generous for a real
 * student, tight enough to catch a loop quickly.
 *
 * Counts against the `messages` table, not `events`, specifically because
 * `messages` already has a SELECT RLS policy scoped to the student's own
 * conversations (see supabase/migrations/0001_init.sql). `events`
 * deliberately has no SELECT policy (M0-03) -- counting against it would
 * require either a new RLS policy or a service-role client, neither of
 * which this minimal guard needs.
 */
export async function checkRateLimit(
  supabase: SupabaseServerClient,
): Promise<RateLimitResult> {
  const cutoff = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", cutoff);

  // Fails open: a rate-limit check that can't run must never block a
  // legitimate student's message over a transient DB issue. This is a
  // basic cost guard, not a hard security boundary -- availability wins
  // here, same trade-off logEvent() already makes for observability.
  if (error || count === null) {
    return { limited: false };
  }

  if (count >= MAX_MESSAGES_PER_WINDOW) {
    return { limited: true, count };
  }

  return { limited: false };
}

const DEMO_DAILY_MESSAGE_LIMIT = 30;

/**
 * A second, separate cap for the public `/demo` account only
 * (DEMO_STUDENT_ID) -- unlike the per-minute guard above, this bounds
 * total cost across every visitor who clicks the link on a given day,
 * since everyone who uses /demo is authenticated as the exact same
 * Supabase user. No-op for every other student.
 */
export async function checkDemoDailyLimit(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<RateLimitResult> {
  const demoStudentId = process.env.DEMO_STUDENT_ID;
  if (!demoStudentId || studentId !== demoStudentId) {
    return { limited: false };
  }

  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", startOfDayUtc.toISOString());

  if (error || count === null) {
    return { limited: false };
  }

  if (count >= DEMO_DAILY_MESSAGE_LIMIT) {
    return { limited: true, count };
  }

  return { limited: false };
}
