import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLearningOverview } from "@/lib/learning-overview/get-learning-overview";
import { getLearningPatterns } from "@/lib/learning-patterns/get-learning-patterns";
import { getRevisionQueue } from "@/lib/revision/get-revision-queue";
import { getRetentionTrend } from "@/lib/retention/get-retention-trend";
import { getLearningSnapshot } from "@/lib/learning-snapshot/get-learning-snapshot";
import { buildRecommendedNext } from "@/lib/recommended-next/recommended-next-aggregation";
import { Card } from "@/design-system/primitives/Card";
import { StatTile } from "@/design-system/primitives/StatTile";
import { ExpandableConceptRow } from "@/components/learning/ExpandableConceptRow";
import { RetentionTrendChart } from "@/components/learning/RetentionTrendChart";
import buttonStyles from "@/design-system/primitives/Button/Button.module.css";
import styles from "./page.module.css";

/**
 * My Learning (enhanced) -- a longitudinal learner-intelligence view:
 * Snapshot -> Recommended Next -> Knowledge Map -> Knowledge Retention ->
 * Patterns MentorOS noticed -> Revision Queue. Every number traces back
 * to learner_concept_mastery/events for this student; nothing here is
 * hardcoded. See retention-aggregation.ts for the one documented
 * heuristic (recency-decay retention, not a measured forgetting-curve
 * result) and learning-patterns-aggregation.ts for why this deliberately
 * does not include an unattributable "learns better from examples"
 * insight.
 */
export default async function LearningPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const studentId = data!.claims!.sub as string;

  const overview = await getLearningOverview(supabase, studentId);

  if (!overview) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>My Learning</h1>
        <p className={styles.body}>Couldn&apos;t load your learning data right now.</p>
      </div>
    );
  }

  const allConcepts = overview.flatMap((chapter) => chapter.concepts);
  const hasAnyActivity = allConcepts.some((c) => c.status !== "new");

  if (!hasAnyActivity) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>My Learning</h1>
        <Card className={styles.emptyCard}>
          <p className={styles.emptyTitle}>Your learning map is just getting started.</p>
          <p className={styles.body}>
            Ask Mentor a few questions or complete an AI Tutor session. MentorOS will start identifying what you understand,
            what needs reinforcement, and when you should revisit it.
          </p>
          <Link href="/chat" className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.sm}`}>
            Start learning &rarr;
          </Link>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const [retentionTrend, revisionQueue, patterns] = await Promise.all([
    getRetentionTrend(supabase, studentId, now),
    getRevisionQueue(supabase, studentId),
    getLearningPatterns(supabase, studentId),
  ]);
  const snapshot = await getLearningSnapshot(
    supabase,
    studentId,
    allConcepts,
    retentionTrend,
    revisionQueue?.reviewNow.length ?? 0,
    now,
  );
  const recommendedNext = revisionQueue ? buildRecommendedNext(revisionQueue, now) : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>My Learning</h1>
      <p className={styles.subtitle}>See what you&apos;re learning, retaining, and ready to tackle next.</p>

      <div className={styles.statGrid}>
        <StatTile
          label="Topics discovered"
          value={snapshot.topicsDiscovered}
          trend={
            snapshot.discoveredThisWeek !== null && snapshot.discoveredThisWeek > 0
              ? { direction: "up", label: `+${snapshot.discoveredThisWeek} this week` }
              : undefined
          }
        />
        <StatTile
          label="Topics mastered"
          value={snapshot.topicsMastered}
          trend={
            snapshot.masteredPercentOfDiscovered !== null
              ? { direction: "flat", label: `${snapshot.masteredPercentOfDiscovered}% of discovered` }
              : undefined
          }
        />
        <StatTile
          label="Knowledge retention"
          value={snapshot.retentionScore !== null ? `${snapshot.retentionScore}%` : "—"}
          trend={
            snapshot.retentionDeltaThisWeek !== null && snapshot.retentionDeltaThisWeek !== 0
              ? {
                  direction: snapshot.retentionDeltaThisWeek > 0 ? "up" : "down",
                  label: `${snapshot.retentionDeltaThisWeek > 0 ? "↑" : "↓"} ${Math.abs(snapshot.retentionDeltaThisWeek)}% this week`,
                }
              : undefined
          }
        />
        <StatTile
          label="Needs revision"
          value={snapshot.needsRevision}
          tone={snapshot.needsRevision > 0 ? "warning" : "neutral"}
          trend={snapshot.needsRevision > 0 ? { direction: "flat", label: "Review recommended" } : undefined}
        />
      </div>

      {recommendedNext && (
        <Card className={styles.recommendedCard}>
          <p className={styles.recommendedLabel}>Recommended next</p>
          <p className={styles.recommendedTitle}>Review: {recommendedNext.conceptName}</p>
          <p className={styles.recommendedReason}>{recommendedNext.reason}</p>
          <div className={styles.recommendedFooter}>
            <span className={styles.recommendedEstimate}>Estimated review: ~{recommendedNext.estimatedMinutes} min</span>
            <Link
              href={`/chat?autosend=revise&concept=${encodeURIComponent(recommendedNext.conceptName)}`}
              className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.sm}`}
            >
              Start revision &rarr;
            </Link>
          </div>
        </Card>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Your Knowledge Map</h2>
        <div className={styles.chapters}>
          {overview.map((chapter) => (
            <Card key={chapter.chapterId} className={styles.chapterCard}>
              <div className={styles.chapterHead}>
                <p className={styles.chapterTitle}>{chapter.chapterTitle}</p>
                {chapter.masteredPercent !== null && (
                  <span className={styles.chapterPercent}>Overall mastery: {chapter.masteredPercent}%</span>
                )}
              </div>
              <div className={styles.conceptList}>
                {chapter.concepts.map((concept) => (
                  <ExpandableConceptRow
                    key={concept.conceptId}
                    conceptId={concept.conceptId}
                    conceptName={concept.conceptName}
                    status={concept.status}
                    masteryScore={concept.masteryScore}
                    retentionScore={concept.retentionScore}
                    reasoning={concept.reasoning}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Knowledge Retention</h2>
        {snapshot.retentionScore === null ? (
          <p className={styles.body}>Nothing to measure retention against yet.</p>
        ) : retentionTrend.length >= 2 ? (
          <RetentionTrendChart buckets={retentionTrend} />
        ) : (
          <p className={styles.body}>Keep learning and a trend will appear here as you build more history.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Patterns MentorOS noticed</h2>
        {!patterns || patterns.length === 0 ? (
          <p className={styles.body}>Nothing flagged more than once yet.</p>
        ) : (
          <div className={styles.patternList}>
            {patterns.map((item) => (
              <Card key={item.text} className={styles.patternCard}>
                <p className={styles.patternLabel}>Repeated challenge</p>
                <p className={styles.patternText}>&ldquo;{item.text}&rdquo;</p>
                <p className={styles.body}>
                  You&apos;ve run into this across {item.frequency} question{item.frequency === 1 ? "" : "s"}
                  {item.conceptNames.length > 0 ? ` in ${item.conceptNames.join(", ")}` : ""}
                  {item.prerequisiteConceptName ? ` -- try revisiting ${item.prerequisiteConceptName} first.` : "."}
                </p>
                <Link
                  href={`/chat?autosend=revise&concept=${encodeURIComponent(item.prerequisiteConceptName ?? item.conceptNames[0] ?? "")}`}
                  className={styles.patternLink}
                >
                  Help me understand &rarr;
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeadRow}>
          <h2 className={styles.sectionHeading}>Revision queue</h2>
          <Link href="/learning/revision" className={styles.sectionLink}>
            View all &rarr;
          </Link>
        </div>
        <p className={styles.body}>{revisionQueueSummary(revisionQueue)}</p>
      </section>
    </div>
  );
}

function revisionQueueSummary(queue: Awaited<ReturnType<typeof getRevisionQueue>>): string {
  if (!queue) return "Couldn't load your revision queue right now.";
  const total = queue.reviewNow.length + queue.reviewSoon.length + queue.onWatch.length;
  if (total === 0) return "Nothing flagged to revisit right now.";
  const parts: string[] = [];
  if (queue.reviewNow.length > 0) parts.push(`${queue.reviewNow.length} to review now`);
  if (queue.reviewSoon.length > 0) parts.push(`${queue.reviewSoon.length} to review soon`);
  if (queue.onWatch.length > 0) parts.push(`${queue.onWatch.length} on watch`);
  return parts.join(", ") + ".";
}

