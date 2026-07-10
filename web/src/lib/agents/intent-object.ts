/**
 * Shared contract produced by the Router Agent (M2) and intended for reuse
 * by future agents (Memory, Adaptive Strategy, Knowledge Retrieval,
 * Evaluation, Analytics, Planning) -- see 05_Agent_Architecture/04_Router_Agent.md.
 *
 * Deliberately excludes execution metadata (model, latency) -- those are
 * observability concerns for whoever calls the Router Agent, not part of
 * what downstream agents need to know about the learner's request.
 */

export type PrimaryIntentCategory =
  | "Learning"
  | "Practice"
  | "Assessment"
  | "Revision"
  | "Session"
  | "Platform";

export type IntentObject = {
  primaryIntent: PrimaryIntentCategory;
  secondaryIntent?: PrimaryIntentCategory;
  confidence: number;
  topic?: string;
  subtopic?: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
};
