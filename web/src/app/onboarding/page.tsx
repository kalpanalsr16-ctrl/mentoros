import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * The Welcome experience + onboarding flow (Sprint 4, Epic F1) -- a
 * top-level route rather than web/src/app/app/onboarding as first
 * sketched in 13_Implementation_Sequence.md; see chat/page.tsx's redirect
 * comment for why (app/layout.tsx's full MinimalShell chrome doesn't fit
 * an onboarding flow's "minimal chrome" spec). No shell, no sidebar --
 * one focused card, same full-bleed pattern /sign-in already uses.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // The proxy already redirects signed-out requests away from
  // /onboarding. This is the same defensive second check every other
  // protected page in this app makes.
  if (!data?.claims) {
    redirect("/sign-in");
  }

  return <OnboardingFlow />;
}
