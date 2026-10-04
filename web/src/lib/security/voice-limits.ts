import { createUsageLimiter } from "./usage-limiter";

/** Conservative development caps. A normal student asks a question every minute or so. */
export const transcribeLimiter = createUsageLimiter({ perMinute: 10, perDay: 150 });
export const avatarSessionLimiter = createUsageLimiter({ perMinute: 6, perDay: 30 });
