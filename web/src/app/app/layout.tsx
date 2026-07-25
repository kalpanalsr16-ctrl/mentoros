import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MinimalShell } from "@/design-system/layouts/MinimalShell";
import { resolveShellForRole } from "@/lib/auth/resolve-shell";
import { BackToDashboardLink } from "@/components/BackToDashboardLink";

/**
 * Authentication shell for the Student experience
 * (docs/ui-architecture/01_Application_Map.md's `/app/*` namespace).
 * The proxy (web/src/proxy.ts) already redirects signed-out requests
 * away from this route group; this is the same defensive second check
 * /chat's own page already makes, plus the role check the proxy
 * deliberately doesn't do (see this sprint's summary for why that split
 * is drawn at the layout level, not the proxy).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
    <MinimalShell userEmail={email} homeHref="/app">
      <BackToDashboardLink />
      {children}
    </MinimalShell>
  );
}
