import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearnerShell } from "@/design-system/layouts/LearnerShell";
import { resolveShellForRole } from "@/lib/auth/resolve-shell";

/**
 * Same auth+role gate as chat/app/tutor's layouts -- applies to every
 * route under /learning (overview, /learning/[conceptId], /learning/
 * revision) since Next.js layouts wrap their whole subtree.
 */
export default async function LearningLayout({ children }: { children: React.ReactNode }) {
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

  const email = data.claims.email as string | undefined;

  return <LearnerShell userEmail={email}>{children}</LearnerShell>;
}
