import Link from "next/link";
import { Card } from "@/design-system/primitives/Card";
import type { LearnerTopic, TopicSuggestion } from "@/lib/learner-topics/learner-topics-aggregation";
import styles from "./LearnerTopicsSection.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Topics from the student's own questions, including subjects outside the curriculum. */
export function LearnerTopicsSection({
  topics,
  suggestions,
}: {
  topics: LearnerTopic[];
  suggestions: TopicSuggestion[];
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Topics from your questions</h2>
      <p className={styles.note}>
        Built from what you asked Ask Mentor. These topics aren&apos;t scored against the curriculum.
      </p>

      {suggestions.length > 0 && (
        <Card className={styles.suggestions}>
          <p className={styles.suggestionsLabel}>Pick up where you left off</p>
          <ul className={styles.suggestionList}>
            {suggestions.map((s) => (
              <li key={s.label} className={styles.suggestionItem}>
                <div>
                  <p className={styles.suggestionTitle}>{s.label}</p>
                  <p className={styles.meta}>{s.reason}</p>
                </div>
                <Link
                  href={`/chat?autosend=revise&concept=${encodeURIComponent(s.label)}`}
                  className={styles.link}
                >
                  Ask again &rarr;
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className={styles.topicGrid}>
        {topics.map((topic) => (
          <Card key={topic.label} className={styles.topic}>
            <div className={styles.topicHead}>
              <p className={styles.topicTitle}>{topic.label}</p>
              <span className={styles.meta}>
                {topic.askCount} {topic.askCount === 1 ? "question" : "questions"} · last {formatDate(topic.lastAskedAt)}
              </span>
            </div>
            {topic.subtopics.length > 0 && <p className={styles.meta}>{topic.subtopics.join(" · ")}</p>}
            <ul className={styles.questionList}>
              {topic.recentQuestions.map((question) => (
                <li key={question} className={styles.question}>
                  &ldquo;{question}&rdquo;
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
