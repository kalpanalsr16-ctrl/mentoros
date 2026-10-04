export type UsageLimitResult = { limited: false } | { limited: true; reason: "per_minute" | "per_day" };

export type UsageLimiter = {
  check: (studentId: string, now?: number) => UsageLimitResult;
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Best-effort, per-process usage guard for paid voice/avatar calls. State
 * lives in memory, so each server instance enforces its own limits; it stops
 * an accidental client loop or a single abusive session, not a determined
 * multi-instance attacker. A cross-instance guard would need a shared store.
 */
export function createUsageLimiter(limits: { perMinute: number; perDay: number }): UsageLimiter {
  const buckets = new Map<string, { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number }>();

  return {
    check(studentId, now = Date.now()) {
      const bucket = buckets.get(studentId) ?? { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
      if (now - bucket.minuteStart >= MINUTE_MS) {
        bucket.minuteStart = now;
        bucket.minuteCount = 0;
      }
      if (now - bucket.dayStart >= DAY_MS) {
        bucket.dayStart = now;
        bucket.dayCount = 0;
      }
      buckets.set(studentId, bucket);

      if (bucket.dayCount >= limits.perDay) return { limited: true, reason: "per_day" };
      if (bucket.minuteCount >= limits.perMinute) return { limited: true, reason: "per_minute" };

      bucket.minuteCount += 1;
      bucket.dayCount += 1;
      return { limited: false };
    },
  };
}
