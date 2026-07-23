import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * G13's own stated acceptance criterion (docs/ui-architecture/
 * 13_Implementation_Sequence.md): "Unit test confirms practice-agent.ts
 * untouched." Same hash-pinning approach as G5's isolation test --
 * these hashes were recorded before Homework Generator's own files were
 * introduced. Also pins lib/llm/client.ts, since 13_Implementation_
 * Sequence.md's own standing rule flags that file (alongside
 * lib/agents/*.ts and /api/chat) as "completed architecture" needing
 * explicit sign-off before any change -- Homework Generator only ever
 * imports generatePracticeSet from it, never modifies it.
 */
const EXPECTED_HASHES: Record<string, string> = {
  "src/lib/agents/practice-agent.ts": "af09d56178e0f989cd6c6de0348aaa4078fc70443f3773e17bb7c24f54a01c3d",
  "src/lib/llm/client.ts": "b6ccd680a4b95b5f9193dbc2544a8261fc592695b0c45903d181536092f1e9fd",
};

for (const [relativePath, expectedHash] of Object.entries(EXPECTED_HASHES)) {
  test(`${relativePath} is unmodified by Epic G13`, () => {
    const content = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    const actualHash = createHash("sha256").update(content).digest("hex");
    assert.equal(actualHash, expectedHash, `${relativePath} content hash changed -- Homework Generator must never modify this file.`);
  });
}
