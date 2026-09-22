import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { LinkButton } from "@/design-system/primitives/LinkButton";
import { ViewReasoningIcon, RetryIcon } from "@/design-system/icons";
import styles from "./MessageBubble.module.css";

export type MessageBubbleVariant = "user" | "assistant" | "safety";

export type MessageBubbleProps = {
  content: string;
  variant: MessageBubbleVariant;
  /** Omitted entirely for user messages and for any assistant turn with no trace_id (pre-Sprint-3 history). */
  onViewReasoning?: () => void;
  /** Only ever the latest assistant message -- see MessageList's isLatestAssistant computation. */
  onRetry?: () => void;
  /** True only while this exact message is the live `chunk` target (Sprint 4) -- shows a trailing caret, never persisted. */
  streaming?: boolean;
};

/**
 * The chat message primitive (docs/ui-architecture/05_Chat_Experience.md,
 * docs/design-system/03-Component-Library.md §7.3). Three variants only
 * -- student, assistant, and a dedicated `safety` treatment that is
 * never styled as an error (Design Principle 1.4). Renders Markdown and
 * LaTeX via react-markdown + remark-math/rehype-katex -- MentorOS is a
 * math tutor; today's plain-text rendering can't express `\frac{1}{2}`
 * at all. `streaming` intentionally re-renders the full Markdown tree on
 * every delta rather than trying to diff/patch it -- an incomplete
 * Markdown token (e.g. an unclosed `**`) can render oddly for a moment,
 * the same accepted cosmetic trade-off every live-Markdown chat product
 * makes, not something worth engineering around.
 */
export function MessageBubble({ content, variant, onViewReasoning, onRetry, streaming }: MessageBubbleProps) {
  return (
    <div className={`${styles.row} ${styles[`${variant}Row`]}`}>
      <div className={styles.column}>
        <div className={`${styles.bubble} ${styles[variant]}`}>
          {variant === "safety" && <span className={styles.safetyLabel}>MentorOS</span>}
          <div className={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {content}
            </ReactMarkdown>
            {streaming && <span className={styles.caret} aria-hidden="true" />}
          </div>
        </div>
        {!streaming && (onViewReasoning || onRetry) && (
          <div className={styles.actions}>
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
          </div>
        )}
      </div>
    </div>
  );
}
