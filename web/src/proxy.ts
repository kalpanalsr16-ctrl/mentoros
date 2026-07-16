import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

// Routes a signed-out visitor must never reach. Role-specific
// authorization (student vs. teacher vs. parent) is deliberately NOT
// checked here -- it happens in each route group's own layout.tsx
// (web/src/app/{app,studio,parent}/layout.tsx), which only needs a
// Postgres round trip for the one route group actually being visited,
// rather than adding a DB query to the proxy layer that every single
// request in the app -- including /api/chat -- passes through.
const PROTECTED_PATHS = ["/chat", "/app", "/studio", "/parent"];

export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request);

  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
