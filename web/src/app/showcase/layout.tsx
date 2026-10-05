import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkShowcaseAccess } from "@/lib/showcase/showcase-access";
import { ShowcaseShell } from "@/components/showcase/ShowcaseShell";

/**
 * Every /showcase route is server-gated here. A signed-out visitor goes to
 * sign-in. A signed-in account without ai_showcase_access gets a plain 404,
 * so the showcase's existence is not revealed to students.
 */
export default async function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const state = await checkShowcaseAccess(supabase);

  if (state === "unauthenticated") redirect("/sign-in");
  if (state === "forbidden") notFound();

  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return <ShowcaseShell userEmail={email}>{children}</ShowcaseShell>;
}
