// Node ESM resolve hook for running this repo's TypeScript test files
// directly via `node --experimental-strip-types`, no bundler. Handles
// two things Node's native resolver doesn't do for TS source:
//   1. The "@/" path alias (tsconfig.json) -> absolute src/ path.
//   2. Extensionless relative imports (`from "./colors"`), which every
//      file in this codebase uses per normal TypeScript convention, but
//      which Node's ESM resolver requires an explicit extension for.
// Must be its own module file -- loader hooks run in a dedicated thread
// and can't be registered inline from the file that calls register().
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXTENSIONS = [".ts", ".tsx", ".mts"];

function resolveOnDisk(basePath) {
  for (const ext of EXTENSIONS) {
    if (existsSync(basePath + ext)) return basePath + ext;
  }
  for (const ext of EXTENSIONS) {
    const indexPath = path.join(basePath, "index" + ext);
    if (existsSync(indexPath)) return indexPath;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const srcDir = fileURLToPath(new URL("../src/", import.meta.url));
    const resolved = resolveOnDisk(path.join(srcDir, specifier.slice(2)));
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = resolveOnDisk(path.join(parentDir, specifier));
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }

  return nextResolve(specifier, context);
}
