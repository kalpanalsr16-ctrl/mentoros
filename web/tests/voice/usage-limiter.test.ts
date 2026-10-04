import { test } from "node:test";
import assert from "node:assert/strict";
import { createUsageLimiter } from "@/lib/security/usage-limiter";

test("usage limiter allows up to the per-minute cap, then blocks until the window rolls over", () => {
  const limiter = createUsageLimiter({ perMinute: 2, perDay: 100 });
  const t0 = 1_000_000;
  assert.equal(limiter.check("s1", t0).limited, false);
  assert.equal(limiter.check("s1", t0 + 1).limited, false);
  assert.deepEqual(limiter.check("s1", t0 + 2), { limited: true, reason: "per_minute" });
  assert.equal(limiter.check("s1", t0 + 60_000).limited, false);
});

test("usage limiter enforces the daily cap across minute windows", () => {
  const limiter = createUsageLimiter({ perMinute: 100, perDay: 3 });
  const t0 = 5_000_000;
  limiter.check("s1", t0);
  limiter.check("s1", t0 + 120_000);
  limiter.check("s1", t0 + 240_000);
  assert.deepEqual(limiter.check("s1", t0 + 360_000), { limited: true, reason: "per_day" });
});

test("usage limiter keeps students separate", () => {
  const limiter = createUsageLimiter({ perMinute: 1, perDay: 10 });
  const t0 = 9_000_000;
  limiter.check("a", t0);
  assert.equal(limiter.check("b", t0).limited, false);
});
