import { Card } from "@/design-system/primitives/Card";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { ViewReasoningIcon } from "@/design-system/icons";
import type { PracticeSet } from "@/lib/agents/practice-agent";
import styles from "./PracticeQuestionCard.module.css";

const DIFFICULTY_BADGE: Record<PracticeSet["difficulty"], BadgeVariant> = {
  Beginner: "success",
  Easy: "success",
  Medium: "brand",
  Advanced: "warning",
  Challenge: "warning",
};

export type PracticeQuestionCardProps = {
  practiceSet: PracticeSet;
  onViewReasoning?: () => void;
};

/**
 * Structured rendering of Practice Agent's output (docs/design-system
 * §7.3, docs/ui-architecture/05_Chat_Experience.md) -- replaces
 * `formatPracticeSetAsReply()`'s flattened text with a real question
 * list, difficulty badge, and estimated time/learning goal. Read-only:
 * Practice Agent generates open-ended questions (not multiple choice),
 * so a student answers by typing in the normal chat input, same as
 * today -- this card has no answer-input UI of its own.
 */
export function PracticeQuestionCard({ practiceSet, onViewReasoning }: PracticeQuestionCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.head}>
        <span className={styles.topic}>{practiceSet.topic}</span>
        <Badge variant={DIFFICULTY_BADGE[practiceSet.difficulty]}>{practiceSet.difficulty}</Badge>
      </div>
      <ol className={styles.questions}>
        {practiceSet.questions.map((question, index) => (
          <li key={index}>{question}</li>
        ))}
      </ol>
      <div className={styles.meta}>
        <span>{practiceSet.estimatedTime}</span>
        <span>{practiceSet.learningGoal}</span>
        {onViewReasoning && (
          <LinkButton icon={<ViewReasoningIcon aria-hidden="true" />} onClick={onViewReasoning} className={styles.reasoningLink}>
            View reasoning
          </LinkButton>
        )}
      </div>
    </Card>
  );
}
