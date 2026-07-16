"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Shared sign-out logic for the new Application Shell headers
 * (StudentShell/TeacherShell/ParentShell). Deliberately NOT wired into
 * the existing `components/SignOutButton.tsx` that `/chat` already
 * uses — this sprint leaves every chat file untouched, at the cost of
 * a small, duplicated `auth.signOut()` call between the two. See this
 * sprint's summary for why that trade-off was made deliberately rather
 * than refactored away.
 */
export function useSignOut() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return { signOut, isSigningOut };
}
