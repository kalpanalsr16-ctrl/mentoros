import * as Sentry from "@sentry/nextjs";

// Runs in the browser, before React hydrates (Next.js file convention,
// introduced v15.3 -- see node_modules/next/dist/docs/.../instrumentation-client.md).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
