import * as Sentry from "@sentry/nextjs";

// Registers the right Sentry.init() for whichever runtime this server
// instance is (Next.js native instrumentation.ts convention -- see
// node_modules/next/dist/docs/.../instrumentation.md).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors from Server Components, Route Handlers, Server
// Actions, and the proxy -- confirmed against Next.js's own
// Instrumentation.onRequestError type (context.routeType includes
// "proxy", matching this project's renamed middleware -> proxy.ts).
export const onRequestError = Sentry.captureRequestError;
