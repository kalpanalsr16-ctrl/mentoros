import { createClient } from "@/lib/supabase/server";
import { listTeacherClasses } from "@/lib/teacher-roster/get-teacher-classes";
import { getEvaluationAnalytics } from "@/lib/evaluation-analytics/get-evaluation-analytics";
import { resolveRange } from "@/lib/progress-analytics/progress-analytics-aggregation";
import { StatTile } from "@/design-system/primitives/StatTile";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { ClassPicker } from "../ClassPicker";
import { EvaluationRangeFilter } from "./EvaluationRangeFilter";
import { SourceAgentFilter } from "./SourceAgentFilter";
import { EvaluationTrendChart } from "./EvaluationTrendChart";
import styles from "./page.module.css";

/**
 * `/studio/evaluation` (Epic I1) -- docs/ui-architecture/
 * 06_Dashboard_Architecture.md's Evaluation Dashboard section, scoped
 * teacher-facing per the approved decision: doc 06 frames this as a
 * platform-wide "engineering/quality surface," but no admin role or
 * cross-student RLS exists in this schema, so this reads only a
 * teacher's own students' evaluation events -- same class-scoped
 * pattern as Progress Analytics (G11). Promoted into the persistent
 * Sidebar (Amazon interview demo prep) after previously being reachable
 * only via the Studio Dashboard's "More tools" row. The regression-alert
 * card renders an honest empty state -- Phase 5's regression-detection
 * backend doesn't exist yet, per the doc's own acceptance criteria for
 * this task.
 */
export default async function EvaluationDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const classes = await listTeacherClasses(supabase, teacherId);
  if (!classes) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Evaluation</h1>
        <p className={styles.body}>Couldn&apos;t load your classes right now.</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Evaluation</h1>
        <p className={styles.body}>Create a class first to see AI-quality trends for your students.</p>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedClassId = typeof resolvedSearchParams.classId === "string" ? resolvedSearchParams.classId : undefined;
  const classId = classes.some((c) => c.id === requestedClassId) ? requestedClassId! : classes[0].id;
  const range = resolveRange(typeof resolvedSearchParams.range === "string" ? resolvedSearchParams.range : null);
  const sourceAgentParam = typeof resolvedSearchParams.sourceAgent === "string" ? resolvedSearchParams.sourceAgent : null;
  const sourceAgent =
    sourceAgentParam === "Concept" || sourceAgentParam === "Practice" || sourceAgentParam === "Assessment" ? sourceAgentParam : null;

  const result = await getEvaluationAnalytics(supabase, teacherId, classId, range, sourceAgent);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Evaluation</h1>

      <ClassPicker classes={classes.map((c) => ({ id: c.id, name: c.name }))} selectedClassId={classId} basePath="/studio/evaluation" extraParams={{ range, ...(sourceAgent ? { sourceAgent } : {}) }} />

      {result.status === "error" && <p className={styles.body}>Couldn&apos;t load evaluation data for that class.</p>}
      {result.status === "forbidden" && <p className={styles.body}>That&apos;s not one of your classes.</p>}

      {result.status === "ok" && (
        <>
          <div className={styles.filterRow}>
            <EvaluationRangeFilter classId={classId} range={range} sourceAgent={sourceAgent} />
            <SourceAgentFilter classId={classId} range={range} sourceAgent={sourceAgent} />
          </div>

          {result.data.interactionCount === 0 ? (
            <p className={styles.body}>No evaluated interactions for {result.data.className} in this range.</p>
          ) : (
            <>
              <div className={styles.statGrid}>
                <StatTile label="Evaluated interactions" value={result.data.interactionCount} />
                <StatTile label="Safety-clean rate" value={`${Math.round(result.data.safetyCleanRate)}%`} />
                <StatTile label="High hallucination-risk rate" value={`${Math.round(result.data.hallucinationRiskRate)}%`} />
              </div>

              <EvaluationTrendChart trends={result.data.trends} />
            </>
          )}

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Regression alerts</h2>
            <Card className={styles.regressionCard}>
              <p className={styles.body}>No regression data available yet -- this requires Phase 5&apos;s evaluation harness, which doesn&apos;t exist yet.</p>
            </Card>
          </section>

          {result.data.flaggedInteractions.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionHeading}>Flagged interactions</h2>
              <div className={styles.list}>
                {result.data.flaggedInteractions.map((f) => (
                  <Card key={`${f.traceId}-${f.reason}`} className={styles.row}>
                    <div className={styles.rowHead}>
                      <p className={styles.rowMeta}>
                        {f.sourceAgent} · {new Date(f.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                      <Badge variant={f.reason === "hallucination" ? "danger" : "warning"}>
                        {f.reason === "hallucination" ? "High hallucination risk" : "Low quality"}
                      </Badge>
                    </div>
                    <p className={styles.rowDetail}>{f.detail}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
