import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CreateLinkRequestResult = { ok: true } | { ok: false; error: string };

/**
 * `POST /api/parent/link-request` (Epic H2) -- docs/ui-architecture/
 * 10_API_Contracts.md: "creates the parent_links row; does NOT grant
 * access until the (unresolved, see 00_Overview.md) verification step
 * completes." This function only ever creates a `pending` row -- there
 * is no path anywhere in this codebase that moves it to `verified`.
 *
 * Deliberately does not validate that studentId belongs to an actual
 * student account: unlike Teacher Studio's addStudentToClass (which
 * could re-check profiles after insert, since class_students grants
 * that visibility), no RLS policy makes a target student's profile
 * visible to an unverified parent -- there's nothing to check against
 * yet. That validation naturally belongs to whichever future sprint
 * designs the real verification flow, not invented here.
 */
export async function createLinkRequest(
  supabase: SupabaseServerClient,
  parentId: string,
  studentId: string,
): Promise<CreateLinkRequestResult> {
  const { error } = await supabase.from("parent_links").insert({ parent_id: parentId, student_id: studentId, status: "pending" });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You've already sent a link request for this student." };
    }
    if (error.code === "23503") {
      return { ok: false, error: "No account found with that ID." };
    }
    return { ok: false, error: "Couldn't create that link request." };
  }

  return { ok: true };
}
