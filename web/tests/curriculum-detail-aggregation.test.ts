import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitRelationships,
  groupMasteryCriteriaByObjective,
  type RelationshipRow,
} from "@/lib/curriculum/curriculum-detail-aggregation";

test("splitRelationships: an incoming prerequisite_of edge surfaces the source concept as a prerequisite", () => {
  const rows: RelationshipRow[] = [{ fromConceptId: "counting", toConceptId: "addition", relationshipType: "prerequisite_of" }];
  const nameById = new Map([["counting", "Counting"]]);
  const result = splitRelationships("addition", rows, nameById);
  assert.deepEqual(result.prerequisites, [{ id: "counting", name: "Counting" }]);
  assert.deepEqual(result.relatedConcepts, []);
});

test("splitRelationships: the reverse direction of prerequisite_of is related, not a prerequisite", () => {
  const rows: RelationshipRow[] = [{ fromConceptId: "addition", toConceptId: "subtraction", relationshipType: "prerequisite_of" }];
  const nameById = new Map([["subtraction", "Subtraction"]]);
  const result = splitRelationships("addition", rows, nameById);
  assert.deepEqual(result.prerequisites, []);
  assert.deepEqual(result.relatedConcepts, [{ id: "subtraction", name: "Subtraction", relationshipType: "prerequisite_of" }]);
});

test("splitRelationships: builds_on/related_to/part_of always land in relatedConcepts regardless of direction", () => {
  const rows: RelationshipRow[] = [
    { fromConceptId: "addition", toConceptId: "regrouping", relationshipType: "builds_on" },
    { fromConceptId: "money-math", toConceptId: "addition", relationshipType: "related_to" },
  ];
  const nameById = new Map([
    ["regrouping", "Regrouping"],
    ["money-math", "Money Math"],
  ]);
  const result = splitRelationships("addition", rows, nameById);
  assert.deepEqual(result.prerequisites, []);
  assert.deepEqual(result.relatedConcepts, [
    { id: "regrouping", name: "Regrouping", relationshipType: "builds_on" },
    { id: "money-math", name: "Money Math", relationshipType: "related_to" },
  ]);
});

test("splitRelationships: falls back to the raw id when a related concept's name wasn't resolved", () => {
  const rows: RelationshipRow[] = [{ fromConceptId: "unknown-concept", toConceptId: "addition", relationshipType: "prerequisite_of" }];
  const result = splitRelationships("addition", rows, new Map());
  assert.deepEqual(result.prerequisites, [{ id: "unknown-concept", name: "unknown-concept" }]);
});

test("groupMasteryCriteriaByObjective: attaches only the matching objective's criteria, in order", () => {
  const objectives = [
    { id: "obj-1", statement: "Add two 2-digit numbers", bloomsLevel: "Apply" },
    { id: "obj-2", statement: "Explain regrouping", bloomsLevel: "Understand" },
  ];
  const criteria = [
    { id: "mc-1", learningObjectiveId: "obj-1", evidenceRequired: "Solves 8/10 practice problems" },
    { id: "mc-2", learningObjectiveId: "obj-2", evidenceRequired: "Verbally explains the process" },
  ];
  const result = groupMasteryCriteriaByObjective(objectives, criteria);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].masteryCriteria, [criteria[0]]);
  assert.deepEqual(result[1].masteryCriteria, [criteria[1]]);
});

test("groupMasteryCriteriaByObjective: an objective with no criteria yet gets an empty array, not undefined", () => {
  const result = groupMasteryCriteriaByObjective([{ id: "obj-1", statement: "x", bloomsLevel: "Remember" }], []);
  assert.deepEqual(result[0].masteryCriteria, []);
});
