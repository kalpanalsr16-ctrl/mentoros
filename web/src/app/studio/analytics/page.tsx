import { createClient } from "@/lib/supabase/server";
import { listTeacherClasses } from "@/lib/teacher-roster/get-teacher-classes";
import { getProgressAnalytics } from "@/lib/progress-analytics/get-progress-analytics";
import { resolveRange } from "@/lib/progress-analytics/progress-analytics-aggregation";
import { StatTile } from "@/design-system/primitives/StatTile";
import { LineTrendChart } from "@/design-system/patterns/LineTrendChart";
import { ClassPicker } from "../ClassPicker";
import { RangeFilter } from "./RangeFilter";
import styles from "./page.module.css";

/**
 * `/studio/analytics` (Epic G11) -- docs/ui-architecture/
 * 03_Teacher_Studio.md's Progress Analytics section: "class/cohort-level
 * trend view over time, distinct from Class Overview's point-in-time
 * snapshot." One of the Design System's 4 fixed top-nav items
 * ("Reports"), so unlike Misconceptions there's no natural referring
 * page to carry a classId from -- the picker here is the only way in.
 */
export default async function ProgressAnalyticsPage({
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
        <h1 className={styles.heading}>Reports</h1>
        <p className={styles.body}>Couldn&apos;t load your classes right now.</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Reports</h1>
        <p className={styles.body}>Create a class first to see progress trends.</p>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedClassId = typeof resolvedSearchParams.classId === "string" ? resolvedSearchParams.classId : undefined;
  const classId = classes.some((c) => c.id === requestedClassId) ? requestedClassId! : classes[0].id;
  const range = resolveRange(typeof resolvedSearchParams.range === "string" ? resolvedSearchParams.range : null);

  const result = await getProgressAnalytics(supabase, teacherId, classId, range);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Reports</h1>

      <div className={styles.filters}>
        <ClassPicker classes={classes.map((c) => ({ id: c.id, name: c.name }))} selectedClassId={classId} basePath="/studio/analytics" extraParams={{ range }} />
        <RangeFilter classId={classId} selectedRange={range} />
      </div>

      {result.status === "error" && <p className={styles.body}>Couldn&apos;t load that class&apos;s analytics.</p>}
      {result.status === "forbidden" && <p className={styles.body}>That&apos;s not one of your classes.</p>}

      {result.status === "ok" && (
        <>
          <div className={styles.statGrid}>
            <StatTile label="Need attention" value={result.data.atRiskCount} />
            <StatTile label="Days with activity" value={result.data.trend.length} />
          </div>

          <LineTrendChart
            title={`${result.data.className} — average mastery`}
            points={result.data.trend.map((p) => ({ timestamp: p.date, value: p.avgMastery * 100 }))}
            formatValue={(value) => `${Math.round(value)}%`}
            emptyLabel="No assessments completed in this range yet."
          />
        </>
      )}
    </div>
  );
}
