import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CreateLinkRequestResult = { status: "pending" } | { status: "rate_limited" };

/**
 * `POST /api/parent/link-request` (Epic H2, rewritten for the approved
 * Parent Verification & Consent design). Calls create_link_request() --
 * the SECURITY DEFINER function that performs the rate-limit check,
 * the insert, and the paired audit-log write atomically -- rather than
 * inserting directly (0015's direct INSERT policy was dropped in
 * 0016_parent_link_verification.sql specifically so this rate limit
 * can't be bypassed).
 *
 * Deliberately collapses every outcome except rate-limiting into the
 * same { status: "pending" } response: whether the target studentId
 * doesn't exist, already has an active request, or was newly created,
 * the caller sees an identical result. This is the anti-enumeration
 * requirement -- the system must never expose whether a given student
 * id exists via this endpoint's response shape.
 */
export async function createLinkRequest(supabase: SupabaseServerClient, studentId: string): Promise<CreateLinkRequestResult> {
  const { error } = await supabase.rpc("create_link_request", { p_student_id: studentId });

  if (error?.message?.includes("rate_limited")) {
    return { status: "rate_limited" };
  }

  // Any other error (nonexistent student, an already-active request for
  // this pair, etc.) intentionally collapses into the same outcome as
  // success.
  return { status: "pending" };
}
