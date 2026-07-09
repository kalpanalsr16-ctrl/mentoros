import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

// Placeholder only — proves sign-in -> protected-route works end to end.
// Task M0-05 (Chat Shell) replaces this content with the real chat UI,
// keeping this same protected route.
export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // The proxy already redirects signed-out requests away from /chat.
  // This is a defensive second check, in case the proxy's matcher ever
  // stops covering this route.
  if (!data?.claims) {
    redirect("/sign-in");
  }

  const email = data.claims.email as string | undefined;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
        You&apos;re signed in{email ? ` as ${email}` : ""}.
      </h1>
      <p style={{ opacity: 0.7 }}>
        The chat screen itself is built in the next task.
      </p>
      <SignOutButton />
    </main>
  );
}
