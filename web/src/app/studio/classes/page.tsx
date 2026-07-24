import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTeacherClasses } from "@/lib/teacher-roster/get-teacher-classes";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import { CreateClassForm } from "./CreateClassForm";
import styles from "./page.module.css";

/**
 * `/studio/classes` (Epic G3) -- docs/ui-architecture/03_Teacher_Studio.md's
 * Class Overview section names this as the roster entry point. Card-list,
 * not a Table -- same call as Epic F5/F8 (the Table primitive doesn't
 * exist yet).
 */
export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const teacherId = claimsData!.claims!.sub as string;

  const classes = await listTeacherClasses(supabase, teacherId);

  if (!classes) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Classes</h1>
        <p className={styles.body}>Couldn&apos;t load your classes right now.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Classes</h1>

      <CreateClassForm />

      {classes.length === 0 ? (
        <p className={styles.body}>Create your first class to start building a roster.</p>
      ) : (
        <div className={styles.classList}>
          {classes.map((c) => (
            <Link key={c.id} href={`/studio/classes/${c.id}`} className={styles.classLink}>
              <Card className={styles.classCard}>
                <div className={styles.classHead}>
                  <p className={styles.className}>{c.name}</p>
                  {c.atRiskCount > 0 && <Badge variant="warning">{c.atRiskCount} need attention</Badge>}
                </div>
                <p className={styles.classMeta}>
                  {c.grade ? `Grade ${c.grade} · ` : ""}
                  {c.studentCount} {c.studentCount === 1 ? "student" : "students"}
                  {c.avgMastery !== null ? ` · ${Math.round(c.avgMastery * 100)}% avg mastery` : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
