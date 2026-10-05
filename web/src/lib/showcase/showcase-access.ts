import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ShowcaseAccessState = "authorized" | "forbidden" | "unauthenticated";

/**
 * Decides access from what the server read. Fails closed: no session, no
 * profile row, or any flag value other than the boolean `true` is denied.
 */
export function decideShowcaseAccess(input: {
  signedIn: boolean;
  profileFound: boolean;
  aiShowcaseAccess: unknown;
}): ShowcaseAccessState {
  if (!input.signedIn) return "unauthenticated";
  if (!input.profileFound) return "forbidden";
  return input.aiShowcaseAccess === true ? "authorized" : "forbidden";
}

/**
 * Reads the caller's own profile row through their RLS-scoped session
 * (0001's self-read policy). Ownership comes from the verified JWT subject,
 * never from anything the client sends.
 */
export async function checkShowcaseAccess(supabase: SupabaseServerClient): Promise<ShowcaseAccessState> {
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return decideShowcaseAccess({ signedIn: false, profileFound: false, aiShowcaseAccess: undefined });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("ai_showcase_access")
    .eq("id", claimsData.claims.sub as string)
    .maybeSingle();

  return decideShowcaseAccess({
    signedIn: true,
    profileFound: !error && Boolean(data),
    aiShowcaseAccess: data?.ai_showcase_access,
  });
}

/** Response for an API route that requires showcase access, or null when access is granted. */
export function showcaseDeniedResponse(state: ShowcaseAccessState): Response | null {
  if (state === "authorized") return null;
  if (state === "unauthenticated") return Response.json({ error: "Not signed in." }, { status: 401 });
  return Response.json({ error: "Not available for this account." }, { status: 403 });
}
