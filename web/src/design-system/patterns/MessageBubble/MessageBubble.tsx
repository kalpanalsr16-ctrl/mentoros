import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import styles from "./MessageBubble.module.css";

export type MessageBubbleVariant = "user" | "assistant" | "safety";

export type MessageBubbleProps = {
  content: string;
  variant: MessageBubbleVariant;
};

/**
 * The chat message primitive (docs/ui-architecture/05_Chat_Experience.md,
 * docs/design-system/03-Component-Library.md §7.3). Three variants only
 * -- student, assistant, and a dedicated `safety` treatment that is
 * never styled as an error (Design Principle 1.4). Renders Markdown and
 * LaTeX via react-markdown + remark-math/rehype-katex -- MentorOS is a
 * math tutor; today's plain-text rendering can't express `\frac{1}{2}`
 * at all.
 */
export function MessageBubble({ content, variant }: MessageBubbleProps) {
  return (
    <div className={`${styles.row} ${styles[variant]}`}>
      <div className={`${styles.bubble} ${styles[variant]}`}>
        {variant === "safety" && <span className={styles.safetyLabel}>MentorOS</span>}
        <div className={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
