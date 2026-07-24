import { Card } from "@/design-system/primitives/Card";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { ViewReasoningIcon, RetryIcon } from "@/design-system/icons";
import type { AssessmentReport, MasteryStatus, RecommendedNextStep } from "@/lib/agents/assessment-agent";
import styles from "./AssessmentFeedbackCard.module.css";

export const STATUS_BADGE: Record<MasteryStatus, BadgeVariant> = {
  Mastered: "success",
  Proficient: "success",
  Developing: "brand",
  NeedsSupport: "warning",
  Beginner: "neutral",
};

const NEXT_STEP_LABEL: Record<RecommendedNextStep, string> = {
  ContinueLearning: "Continue learning",
  GenerateMorePractice: "More practice",
  ReturnToConceptExplanation: "Revisit the concept",
  StartRevision: "Start revision",
  AdvanceToNextTopic: "Move to the next topic",
};

export type AssessmentFeedbackCardProps = {
  assessmentReport: AssessmentReport;
  onViewReasoning?: () => void;
  /** Only ever the latest assistant message -- see MessageList's isLatestAssistant computation. */
  onRetry?: () => void;
};

/**
 * Structured rendering of Assessment Agent's output (docs/design-system
 * §7.3) -- replaces `formatAssessmentReportAsReply()`'s flattened text
 * with a mastery ring, status badge, misconceptions list, and a plain-
 * language next step, per Design Principle 1.4 (wrong answers are
 * progress, not failure) -- misconceptions are framed as feedback, never
 * styled as errors.
 */
export function AssessmentFeedbackCard({ assessmentReport, onViewReasoning, onRetry }: AssessmentFeedbackCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.head}>
        <ProgressRing value={assessmentReport.masteryScore} size={48} />
        <div className={styles.headText}>
          <Badge variant={STATUS_BADGE[assessmentReport.status]}>{assessmentReport.status}</Badge>
        </div>
      </div>

      <p className={styles.feedback}>{assessmentReport.feedback}</p>

      {assessmentReport.misconceptions.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Worth reviewing</p>
          <ul className={styles.misconceptions}>
            {assessmentReport.misconceptions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.footer}>
        <span>Next: {NEXT_STEP_LABEL[assessmentReport.recommendedNextStep]}</span>
        {(onViewReasoning || onRetry) && (
          <span className={styles.reasoningLink}>
            {onViewReasoning && (
              <LinkButton icon={<ViewReasoningIcon aria-hidden="true" />} onClick={onViewReasoning}>
                View reasoning
              </LinkButton>
            )}
            {onRetry && (
              <LinkButton icon={<RetryIcon aria-hidden="true" />} onClick={onRetry}>
                Retry
              </LinkButton>
            )}
          </span>
        )}
      </div>
    </Card>
  );
}
