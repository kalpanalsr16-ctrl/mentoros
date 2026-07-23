import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type VerifiedChild = {
  studentId: string;
  displayName: string;
};

/**
 * The child selector on `/parent` -- unlike list-links-for-parent.ts
 * (which deliberately can't show a name, since no policy existed yet),
 * this can join `profiles` for real: 0017_parent_verified_read.sql adds
 * exactly that read, scoped to verified links only. Filters to
 * 'verified' here rather than reusing listLinksForParent's full history,
 * since a pending/rejected/revoked row has no business appearing as a
 * navigable child.
 */
export async function listVerifiedChildren(supabase: SupabaseServerClient, parentId: string): Promise<VerifiedChild[]> {
  const { data: linkRows, error } = await supabase
    .from("parent_links")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("status", "verified");

  if (error || !linkRows || linkRows.length === 0) return [];

  const studentIds = linkRows.map((r) => r.student_id);
  const { data: profileRows } = await supabase.from("profiles").select("id, display_name").in("id", studentIds);
  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name ?? "Your child"]));

  return studentIds.map((studentId) => ({
    studentId,
    displayName: nameById.get(studentId) ?? "Your child",
  }));
}
