import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeacherShell } from "@/design-system/layouts/TeacherShell";
import { resolveShellForRole } from "@/lib/auth/resolve-shell";

/** Authentication shell for Teacher Studio (`/studio/*`). Same pattern as `/app`'s layout. */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
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
  if (role !== "teacher") {
    redirect(resolveShellForRole(role));
  }

  const email = data.claims.email as string | undefined;

  return <TeacherShell userEmail={email}>{children}</TeacherShell>;
}
