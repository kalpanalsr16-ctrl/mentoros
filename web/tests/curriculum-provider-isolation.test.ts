import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// process.cwd() rather than __dirname/import.meta.url -- these test
// files get reparsed as ESM by Node's TS type-stripping (no __dirname),
// and `npm test`'s glob (package.json) already assumes cwd is `web/`.

/**
 * G5's own stated acceptance criterion (docs/ui-architecture/
 * 13_Implementation_Sequence.md): "New interface, does not modify
 * KnowledgeProvider/ConceptSearchProvider" -- verified via a "diff
 * check." A hash pin does this without shelling out to git (works the
 * same in a shallow CI clone as locally): each hash below was recorded
 * from these files' content at the moment CurriculumProvider was
 * introduced, before any of this sprint's own changes. If this test
 * ever fails, it means one of these three files changed -- that's a
 * deliberate, separate decision to review, never a side effect of
 * touching the new curriculum-provider files.
 */
const EXPECTED_HASHES: Record<string, string> = {
  "src/lib/knowledge/knowledge-provider.ts": "7cdeb0f0ae0fc977afe254a0cc7e7424e3655ec7f1df20751687ad0dc19f0697",
  "src/lib/knowledge/concept-search-provider.ts": "b64517dc27a39effdc9cc5718d2148c02a1e75f43b80e41baa24488b9419881a",
  "src/lib/knowledge/postgres-knowledge-provider.ts": "def8d8546333c3ae13696a516ddaafd2d88df8846ac1b860d096ba28612bb2d1",
};

for (const [relativePath, expectedHash] of Object.entries(EXPECTED_HASHES)) {
  test(`${relativePath} is unmodified by Epic G5`, () => {
    const content = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    const actualHash = createHash("sha256").update(content).digest("hex");
    assert.equal(actualHash, expectedHash, `${relativePath} content hash changed -- CurriculumProvider must never modify this file.`);
  });
}
