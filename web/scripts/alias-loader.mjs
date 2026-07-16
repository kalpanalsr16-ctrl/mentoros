// Rewrites the "@/" TypeScript path alias (tsconfig.json) to an
// absolute src/ path so Node's built-in TypeScript stripping
// (--experimental-strip-types) can load these files directly for
// `npm test`, without a bundler. Registered via --import in
// package.json's "test" script.
//
// This is a permanent, committed replacement for the ad hoc
// alias-loader scripts used throughout M6-M9's manual verification
// passes (see docs/implementation/*.md) -- this sprint is the first to
// port that pattern into the repository itself as real, running tests.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

register(
  pathToFileURL(path.join(__dirname, "alias-resolve-hook.mjs")).href,
  import.meta.url,
);

// Guard against a silently-missing src directory (e.g. wrong cwd) --
// fail loudly rather than every test import mysteriously 404ing.
if (!existsSync(srcDir)) {
  throw new Error(`alias-loader.mjs: expected src directory at ${srcDir}`);
}
