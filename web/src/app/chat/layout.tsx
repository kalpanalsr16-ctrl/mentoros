import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearnerShell } from "@/design-system/layouts/LearnerShell";
import { resolveShellForRole } from "@/lib/auth/resolve-shell";

/**
 * Same auth+role gate as web/src/app/app/layout.tsx (duplicated per
 * top-level route, matching this codebase's existing convention --
 * studio/layout.tsx and parent/layout.tsx each do the same rather than
 * sharing one route-group layout). page.tsx does its own separate
 * getClaims() call for its own data needs, same redundant-but-consistent
 * pattern already used throughout /app/*.
 */
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <LearnerShell userEmail={email} fullBleed>
      {children}
    </LearnerShell>
  );
}
