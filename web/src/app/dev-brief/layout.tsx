import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearnerShell } from "@/design-system/layouts/LearnerShell";
import { resolveShellForRole } from "@/lib/auth/resolve-shell";
import { checkShowcaseAccess } from "@/lib/showcase/showcase-access";

/**
 * Same auth+role gate as the other learner-facing layouts, plus the showcase
 * capability: Dev Brief shows evaluation internals, so students get a 404.
 * Applies to /dev-brief and /dev-brief/results.
 */
export default async function DevBriefLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub as string)
    .single();

  const role = profile?.role ?? "student";
  if (role !== "student") {
    redirect(resolveShellForRole(role));
  }

  if ((await checkShowcaseAccess(supabase)) !== "authorized") notFound();

  const email = data.claims.email as string | undefined;

  return (
    <LearnerShell userEmail={email} showcaseAccess>
      {children}
    </LearnerShell>
  );
}
