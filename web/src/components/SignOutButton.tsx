"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        padding: "0.5rem 1rem",
        borderRadius: 6,
        border: "1px solid #999",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
