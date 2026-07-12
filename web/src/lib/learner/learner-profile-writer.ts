import type { LearnerState } from "@/lib/learner/learner-state";

/**
 * One concept's worth of new evidence to merge into the learner's
 * profile -- Memory Agent's write contract. `masteryScore` is 0-1
 * (LearnerState's scale); callers converting from Assessment Agent's
 * 0-100 `masteryScore` are responsible for that conversion (see
 * lib/agents/memory-agent.ts).
 */
export type LearnerProfileEvidence = {
  studentId: string;
  conceptId: string;
  masteryScore: number;
  commonMistakes?: string[];
  confidence?: LearnerState["confidence"];
};

/**
 * Storage-agnostic contract for updating a learner's profile --
 * Memory Agent depends only on this interface, mirroring the
 * KnowledgeProvider/LearnerStateProvider pattern every prior milestone
 * has used. Per 12_Memory_Agent.md, this is the ONLY write path to the
 * Learner Profile in the whole system; no other agent holds a reference
 * to an implementation of this interface.
 */
export interface LearnerProfileWriter {
  applyEvidence(evidence: LearnerProfileEvidence): Promise<void>;
}
