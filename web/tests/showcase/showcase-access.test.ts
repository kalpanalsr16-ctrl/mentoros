import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkShowcaseAccess,
  decideShowcaseAccess,
  showcaseDeniedResponse,
} from "@/lib/showcase/showcase-access";

type FakeQueryResult = { data: { ai_showcase_access?: unknown } | null; error: { message: string } | null };

/**
 * Stand-in for the request-scoped Supabase client. Records every profile
 * lookup so tests can assert which row was asked for and that no query ran
 * when there was no verified session.
 */
function fakeSupabase(options: { claims: { sub: string } | null; profile?: FakeQueryResult }) {
  const lookups: { table: string; column: string; value: unknown }[] = [];
  const client = {
    auth: {
      getClaims: async () => ({ data: options.claims ? { claims: options.claims } : null }),
    },
    from(table: string) {
      return {
        select(column: string) {
          return {
            eq(_field: string, value: unknown) {
              lookups.push({ table, column, value });
              return {
                maybeSingle: async () => options.profile ?? { data: null, error: null },
              };
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as Parameters<typeof checkShowcaseAccess>[0], lookups };
}

test("only the boolean true grants showcase access", () => {
  assert.equal(
    decideShowcaseAccess({ signedIn: true, profileFound: true, aiShowcaseAccess: true }),
    "authorized",
  );
  for (const flag of [false, undefined, null, "true", 1, "t"]) {
    assert.equal(
      decideShowcaseAccess({ signedIn: true, profileFound: true, aiShowcaseAccess: flag }),
      "forbidden",
      `flag ${String(flag)} must not grant access`,
    );
  }
});

test("signed-out visitors are unauthenticated regardless of profile data", () => {
  assert.equal(
    decideShowcaseAccess({ signedIn: false, profileFound: true, aiShowcaseAccess: true }),
    "unauthenticated",
  );
});

test("a signed-in account with no readable profile row is forbidden", () => {
  assert.equal(
    decideShowcaseAccess({ signedIn: true, profileFound: false, aiShowcaseAccess: true }),
    "forbidden",
  );
});

test("demo-style authorized account can access the showcase", async () => {
  const { client, lookups } = fakeSupabase({
    claims: { sub: "demo-user" },
    profile: { data: { ai_showcase_access: true }, error: null },
  });
  assert.equal(await checkShowcaseAccess(client), "authorized");
  assert.deepEqual(lookups, [{ table: "profiles", column: "ai_showcase_access", value: "demo-user" }]);
});

test("normal student account is forbidden", async () => {
  const { client } = fakeSupabase({
    claims: { sub: "student-user" },
    profile: { data: { ai_showcase_access: false }, error: null },
  });
  assert.equal(await checkShowcaseAccess(client), "forbidden");
});

test("unauthenticated request never queries the profile table", async () => {
  const { client, lookups } = fakeSupabase({ claims: null });
  assert.equal(await checkShowcaseAccess(client), "unauthenticated");
  assert.equal(lookups.length, 0);
});

test("a profile read error fails closed", async () => {
  const { client } = fakeSupabase({
    claims: { sub: "student-user" },
    profile: { data: null, error: { message: "permission denied" } },
  });
  assert.equal(await checkShowcaseAccess(client), "forbidden");
});

test("the lookup key comes only from the verified JWT subject", async () => {
  const { client, lookups } = fakeSupabase({
    claims: { sub: "verified-sub" },
    profile: { data: { ai_showcase_access: false }, error: null },
  });
  await checkShowcaseAccess(client);
  assert.equal(lookups.length, 1);
  assert.equal(lookups[0].value, "verified-sub");
});

test("API denial maps to 401 when signed out and 403 when not authorized", async () => {
  assert.equal(showcaseDeniedResponse("authorized"), null);

  const unauthenticated = showcaseDeniedResponse("unauthenticated");
  assert.equal(unauthenticated?.status, 401);

  const forbidden = showcaseDeniedResponse("forbidden");
  assert.equal(forbidden?.status, 403);
  const body = (await forbidden!.json()) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body), ["error"]);
});
