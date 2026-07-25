import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConceptDetail } from "@/lib/curriculum/get-concept-detail";
import { Card } from "@/design-system/primitives/Card";
import { Badge } from "@/design-system/primitives/Badge";
import styles from "./page.module.css";

const RELATIONSHIP_LABEL: Record<string, string> = {
  builds_on: "Builds on",
  related_to: "Related to",
  part_of: "Part of",
  prerequisite_of: "Leads to",
};

/**
 * `/studio/curriculum/:conceptId` (Epic G6 detail view) -- everything
 * 09_Curriculum_Foundation.md's Part A/B/C model attaches to one concept:
 * objectives (with their mastery criteria), prerequisites, related
 * concepts, misconceptions, teaching strategies, and provenance.
 */
export default async function ConceptDetailPage({ params }: { params: Promise<{ conceptId: string }> }) {
  const { conceptId } = await params;
  const supabase = await createClient();
  const result = await getConceptDetail(supabase, conceptId);

  if (result.status === "not_found") {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>That concept doesn&apos;t exist</h1>
        <Link href="/studio/curriculum" className={styles.backLink}>
          ← Curriculum Explorer
        </Link>
      </div>
    );
  }

  const concept = result.data;
  const breadcrumb = [concept.subject?.name, concept.grade?.gradeLevel, concept.chapter?.title].filter(Boolean).join(" · ");

  return (
    <div className={styles.page}>
      <Link href="/studio/curriculum" className={styles.backLink}>
        ← Curriculum Explorer
      </Link>

      {breadcrumb && <p className={styles.breadcrumb}>{breadcrumb}</p>}
      <h1 className={styles.heading}>{concept.name}</h1>
      <p className={styles.body}>{concept.description}</p>

      <section>
        <p className={styles.sectionLabel}>Learning objectives</p>
        {concept.objectives.length === 0 ? (
          <p className={styles.body}>None recorded yet.</p>
        ) : (
          <div className={styles.itemList}>
            {concept.objectives.map((o) => (
              <Card key={o.id} className={styles.itemCard}>
                <div className={styles.itemHead}>
                  <span>{o.statement}</span>
                  <Badge variant="brand">{o.bloomsLevel}</Badge>
                </div>
                {o.masteryCriteria.length > 0 && (
                  <ul className={styles.masteryList}>
                    {o.masteryCriteria.map((mc) => (
                      <li key={mc.id} className={styles.masteryItem}>
                        {mc.evidenceRequired}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={styles.sectionLabel}>Prerequisites</p>
        {concept.prerequisites.length === 0 ? (
          <p className={styles.body}>None recorded yet.</p>
        ) : (
          <div className={styles.chipRow}>
            {concept.prerequisites.map((p) => (
              <Link key={p.id} href={`/studio/curriculum/${p.id}`} className={styles.conceptChip}>
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={styles.sectionLabel}>Related concepts</p>
        {concept.relatedConcepts.length === 0 ? (
          <p className={styles.body}>None recorded yet.</p>
        ) : (
          <div className={styles.chipRow}>
            {concept.relatedConcepts.map((r) => (
              <Link key={r.id} href={`/studio/curriculum/${r.id}`} className={styles.conceptChip}>
                {r.name}
                <span className={styles.chipMeta}>{RELATIONSHIP_LABEL[r.relationshipType] ?? r.relationshipType}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={styles.sectionLabel}>Common misconceptions</p>
        {concept.misconceptions.length === 0 ? (
          <p className={styles.body}>None recorded yet.</p>
        ) : (
          <div className={styles.itemList}>
            {concept.misconceptions.map((m) => (
              <Card key={m.id} className={styles.itemCard}>
                <p className={styles.itemText}>{m.description}</p>
                {m.commonTriggers && <p className={styles.itemMeta}>Common triggers: {m.commonTriggers}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={styles.sectionLabel}>Teaching strategies</p>
        {concept.teachingStrategies.length === 0 ? (
          <p className={styles.body}>None recorded yet.</p>
        ) : (
          <div className={styles.itemList}>
            {concept.teachingStrategies.map((s) => (
              <Card key={s.id} className={styles.itemCard}>
                <p className={styles.itemText}>{s.description}</p>
                {s.whenToUse && <p className={styles.itemMeta}>When to use: {s.whenToUse}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={styles.sectionLabel}>Source &amp; provenance</p>
        <div className={styles.provenanceGrid}>
          <span className={styles.provenanceLabel}>Standard</span>
          <span>{concept.provenance.standardCode ?? "—"}</span>
          <span className={styles.provenanceLabel}>Source</span>
          <span>{concept.provenance.source ?? "—"}</span>
          <span className={styles.provenanceLabel}>Last reviewed by</span>
          <span>{concept.provenance.lastReviewedBy ?? "—"}</span>
          <span className={styles.provenanceLabel}>Effective</span>
          <span>
            {concept.provenance.effectiveFrom ?? "—"}
            {concept.provenance.effectiveUntil ? ` – ${concept.provenance.effectiveUntil}` : ""}
          </span>
          <span className={styles.provenanceLabel}>Version</span>
          <span>{concept.provenance.version}</span>
        </div>
      </section>
    </div>
  );
}
