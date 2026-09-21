// Node ESM resolve hook for running this repo's TypeScript source files
// directly via `node --experimental-strip-types`, no bundler. Handles
// three things Node's native resolver doesn't do for TS source:
//   1. The "@/" path alias (tsconfig.json) -> absolute src/ path.
//   2. Extensionless relative imports (`from "./colors"`), which every
//      file in this codebase uses per normal TypeScript convention, but
//      which Node's ESM resolver requires an explicit extension for.
//   3. Extensionless node_modules subpaths (`next/headers`) for packages
//      with no "exports" map -- Next itself ships next/headers.js and
//      resolves the extensionless form fine via its own webpack/CJS
//      tooling, but plain Node ESM resolution requires the exact
//      filename. Only engaged as a fallback after Node's own resolution
//      already failed, so this can't change behavior for anything that
//      already resolves (scripts/run-golden-eval.ts needs this to import
//      src/app/api/chat/route.ts, which pulls in next/headers
//      transitively via lib/supabase/server.ts).
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

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" && !specifier.endsWith(".js")) {
      try {
        return await nextResolve(specifier + ".js", context);
      } catch {
        // Fall through to rethrow the original error below -- it names
        // the real specifier, not the ".js" guess.
      }
    }
    throw err;
  }
}
