import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Recruiter-facing entry point: `/demo` signs the visitor into the
 * fixed public demo student account and drops them straight into
 * `/chat` -- no sign-up, no credentials to hand out on a resume. Safe
 * to be a single shared account because /api/chat's demo daily cap
 * (lib/security/rate-limit.ts) bounds this account's total real-API
 * cost regardless of how many people click the link, and the account
 * has no real student data behind it.
 */
export async function GET(request: Request) {
  const email = process.env.DEMO_STUDENT_EMAIL;
  const password = process.env.DEMO_STUDENT_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ error: "Demo is not configured." }, { status: 500 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Demo is temporarily unavailable." }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/chat", request.url));
}
