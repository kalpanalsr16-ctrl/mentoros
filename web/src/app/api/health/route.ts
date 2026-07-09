export async function GET() {
  let database: "connected" | "error" = "error";
  let databaseError: string | undefined;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Supabase's Auth service responds 200 to a valid anon key and 401 to an
    // invalid one, without needing any database table to exist yet — makes
    // this a real end-to-end proof of connectivity, not just "the client
    // object was constructed without an error."
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    });

    if (response.ok) {
      database = "connected";
    } else {
      database = "error";
      const body = await response.json().catch(() => null);
      databaseError = body?.message ?? `HTTP ${response.status}`;
    }
  } catch (err) {
    database = "error";
    databaseError = err instanceof Error ? err.message : "Unknown error";
  }

  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database,
    ...(databaseError ? { databaseError } : {}),
  });
}
