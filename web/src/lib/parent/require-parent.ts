import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ParentAuth = { supabase: SupabaseServerClient; parentId: string };
export type ParentAuthResult = ParentAuth | { error: Response };

/** Signed-in + role === 'parent' -- same shape as teacher-roster/require-teacher.ts. */
export async function requireParent(): Promise<ParentAuthResult> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return { error: Response.json({ error: "Not signed in." }, { status: 401 }) };
  }

  const parentId = claimsData.claims.sub as string;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", parentId).single();

  if (profile?.role !== "parent") {
    return { error: Response.json({ error: "Parent access required." }, { status: 403 }) };
  }

  return { supabase, parentId };
}
