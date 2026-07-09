import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Exposes Vercel's server-side VERCEL_ENV ("production" | "preview" |
    // "development") to browser code, so Sentry can tell a staging error
    // apart from a real production one. NODE_ENV is always "production"
    // for any built Next.js app regardless of which Vercel environment
    // it's deployed to, so it can't be used for this on its own.
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
};

export default nextConfig;
