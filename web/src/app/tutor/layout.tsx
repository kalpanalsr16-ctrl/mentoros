import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearnerShell } from "@/design-system/layouts/LearnerShell";
import { resolveShellForRole } from "@/lib/auth/resolve-shell";

/** Same auth+role gate as web/src/app/app/layout.tsx and web/src/app/chat/layout.tsx. */
export default async function TutorLayout({ children }: { children: React.ReactNode }) {
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
