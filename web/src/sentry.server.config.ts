import * as Sentry from "@sentry/nextjs";

// Minimal setup: error capture only. No performance tracing, session
// replay, or feedback widget -- those are real features but go beyond
// M0's baseline goal ("unhandled errors are automatically captured and
// visible"). Source map upload (readable stack traces) is deferred too,
// since it needs a Sentry auth token this milestone doesn't require.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // VERCEL_ENV distinguishes "production" from "preview" (staging);
  // NODE_ENV alone can't, since it's "production" for any built app
  // regardless of which Vercel environment it's deployed to.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
