import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ARCHITECTURE_DECISIONS,
  ARCHITECTURE_NODES,
  CLAIMS_NOT_MADE,
} from "@/lib/showcase/architecture/architecture-model";

const REPO_ROOT = resolve(process.cwd(), "..");
const SRC_ROOT = resolve(process.cwd(), "src");

function allSourceText(dir: string): string {
  let text = "";
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) text += allSourceText(path);
    else if (/\.(ts|tsx)$/.test(entry)) text += readFileSync(path, "utf8");
  }
  return text;
}

const SOURCE = allSourceText(SRC_ROOT);

test("every event named on the map is written by the code", () => {
  for (const node of ARCHITECTURE_NODES) {
    for (const event of node.events) {
      assert.ok(SOURCE.includes(`"${event}"`), `${node.id} names "${event}", which the code never writes`);
    }
  }
});

test("every decision's rationale source exists in the repository", () => {
  for (const decision of ARCHITECTURE_DECISIONS) {
    for (const source of decision.sources) {
      assert.ok(existsSync(join(REPO_ROOT, source)), `${decision.id} cites missing file ${source}`);
    }
  }
});

test("every node's design decision refers to a decision that exists", () => {
  const ids = new Set(ARCHITECTURE_DECISIONS.map((d) => d.id));
  for (const node of ARCHITECTURE_NODES) {
    if (node.decisionId) assert.ok(ids.has(node.decisionId), `${node.id} refers to unknown decision ${node.decisionId}`);
  }
});

test("node IDs are unique and every node carries its required detail", () => {
  const ids = ARCHITECTURE_NODES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const node of ARCHITECTURE_NODES) {
    for (const field of ["title", "responsibility", "input", "output", "failure", "observability"] as const) {
      assert.ok(node[field].trim().length > 0, `${node.id} has an empty ${field}`);
    }
    assert.ok(node.dependencies.length > 0, `${node.id} lists no dependencies`);
  }
});

test("external-provider nodes name the provider they call", () => {
  for (const node of ARCHITECTURE_NODES) {
    if (node.status === "external_provider") assert.ok(node.provider, `${node.id} is external but names no provider`);
  }
});

test("decisions surfaced as open are not presented as verified", () => {
  for (const decision of ARCHITECTURE_DECISIONS) {
    if (decision.rationale === "open") {
      assert.ok(decision.why.includes("No written rationale") || decision.why.includes("not recorded") || decision.why.includes("ADR 003 lists"), decision.id);
    }
  }
});

test("no secret-like values or credential names appear in the architecture model", () => {
  const modelText = readFileSync(join(SRC_ROOT, "lib/showcase/architecture/architecture-model.ts"), "utf8");
  for (const pattern of [/sk-[A-Za-z0-9]/, /API_KEY/, /SERVICE_ROLE/, /PASSWORD/i, /eyJ[A-Za-z0-9_-]{10,}/]) {
    assert.equal(pattern.test(modelText), false, `model matches ${pattern}`);
  }
});

test("the claims-not-made list names the gaps this phase does not close", () => {
  const text = CLAIMS_NOT_MADE.join(" ");
  assert.ok(text.includes("waterfall"));
  assert.ok(text.includes("Live end-to-end verification is pending"));
  assert.ok(text.includes("chain-of-thought"));
});
