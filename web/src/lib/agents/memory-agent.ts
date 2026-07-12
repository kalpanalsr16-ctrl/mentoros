import type { AssessmentReport } from "@/lib/agents/assessment-agent";
import type { ReflectionReport } from "@/lib/agents/reflection-agent";
import type { LearnerProfileEvidence, LearnerProfileWriter } from "@/lib/learner/learner-profile-writer";

/**
 * Memory Agent's input contract, per
 * 05_Agent_Architecture/12_Memory_Agent.md's Inputs section: Reflection
 * Report, Assessment Report, and (implicitly) which concept this
 * evidence is about. `conceptId` is null when no concept resolved for
 * this turn -- there's nothing to persist mastery against in that case.
 * `reflectionReport` is nullable too: if Reflection Agent failed, Memory
 * Agent still has real evidence from Assessment alone and shouldn't
 * discard it (see buildLearnerProfileEvidence()).
 */
export type MemoryAgentContext = {
  studentId: string;
  conceptId: string | null;
  assessmentReport: AssessmentReport;
  reflectionReport: ReflectionReport | null;
};

/**
 * Deliberately NOT a Claude call, unlike every other agent in this
 * codebase. By the time evidence reaches Memory Agent, Assessment (and,
 * when available, Reflection) have already done the interpretive work --
 * merging that into the profile (a mastery running average, appending
 * newly seen misconceptions, carrying forward a confidence estimate) is
 * mechanical, not judgment. Keeping this a pure function avoids a third
 * Claude call on every assessment turn and makes the merge logic
 * directly, exhaustively unit-testable without mocking an LLM response.
 *
 * masteryScore is converted from Assessment Agent's 0-100 scale to
 * LearnerState's 0-1 scale here -- the one place that conversion happens.
 */
export function buildLearnerProfileEvidence(
  context: MemoryAgentContext,
): LearnerProfileEvidence | null {
  if (!context.conceptId) {
    return null;
  }

  const misconceptions = context.reflectionReport
    ? [...new Set([...context.assessmentReport.misconceptions, ...context.reflectionReport.misconceptions])]
    : context.assessmentReport.misconceptions;

  return {
    studentId: context.studentId,
    conceptId: context.conceptId,
    masteryScore: context.assessmentReport.masteryScore / 100,
    commonMistakes: misconceptions,
    confidence: context.reflectionReport?.confidence,
  };
}

/**
 * Orchestration: builds the evidence, then calls the injected writer --
 * same injected-dependency seam every other agent uses, just without a
 * `generate` function to inject since there's no generation step here.
 * Returns whether anything was actually written, so the caller can log
 * accordingly without needing to re-check `conceptId` itself.
 */
export async function updateLearnerProfile(
  context: MemoryAgentContext,
  writer: LearnerProfileWriter,
): Promise<{ applied: boolean; evidence: LearnerProfileEvidence | null }> {
  const evidence = buildLearnerProfileEvidence(context);
  if (!evidence) {
    return { applied: false, evidence: null };
  }
  await writer.applyEvidence(evidence);
  return { applied: true, evidence };
}
