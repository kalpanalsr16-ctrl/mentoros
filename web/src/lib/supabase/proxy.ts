import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the student's session cookies on every request and reports
 * whether the request is currently authenticated. Called from the
 * project's proxy.ts (Next.js 16 renamed "middleware" to "proxy" —
 * see node_modules/next/dist/docs/.../proxy.md).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Cache-Control / Expires / Pragma headers Supabase asks us to
          // forward whenever session cookies are set, so a CDN or reverse
          // proxy never caches (and replays) one student's session token
          // for a different student.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // getClaims() validates the JWT signature locally against the project's
  // published keys and refreshes the session (via setAll above) if the
  // access token is stale — no extra network round trip on the common path.
  const { data } = await supabase.auth.getClaims();

  return { response, isAuthenticated: !!data?.claims };
}
