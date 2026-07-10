import type { LearnerState } from "@/lib/learner/learner-state";

/**
 * Storage-agnostic contract for reading a learner's state -- Planning
 * Agent depends only on this interface, never on a specific persistence
 * mechanism. Today's implementation (UnknownLearnerStateProvider) always
 * reports an unknown learner, since no agent (Assessment/Memory, M7/M8)
 * exists yet to have written real mastery data. A future Postgres-backed
 * implementation reads real values without Planning Agent's code
 * changing, the same relationship KnowledgeProvider has with M5.
 */
export interface LearnerStateProvider {
  getLearnerState(studentId: string): Promise<LearnerState>;
}
