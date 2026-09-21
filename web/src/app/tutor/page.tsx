import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoadmapData } from "@/lib/roadmap/get-roadmap-data";
import { ConceptPicker } from "@/components/tutor/ConceptPicker";
import { TutorWorkspace } from "@/components/tutor/TutorWorkspace";
import styles from "./page.module.css";

/**
 * AI Tutor (learner UI redesign) -- a single-concept teaching workspace,
 * not a fake avatar/video experience. Reuses the exact same
 * getRoadmapData() the Learning Roadmap page already reads (real
 * chapters/concepts/prerequisite graph + this student's own
 * learner_concept_mastery), so the concept picker never invents
 * curriculum data. The workspace itself drives a real, fresh
 * /api/chat turn per concept (see TutorWorkspace) -- the same Concept/
 * Practice Agent pipeline Ask Mentor uses, just framed as a lesson
 * instead of a chat transcript.
 */
export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/sign-in");
  }

  const studentId = data.claims.sub as string;
  const roadmap = await getRoadmapData(supabase, studentId);

  const resolvedSearchParams = await searchParams;
  const conceptParam = resolvedSearchParams.concept;
  const requestedConceptId = typeof conceptParam === "string" ? conceptParam : undefined;

  if (!roadmap) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>AI Tutor</h1>
        <p className={styles.body}>Couldn&apos;t load your curriculum right now.</p>
      </div>
    );
  }

  if (roadmap.degraded) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>AI Tutor</h1>
        <p className={styles.body}>
          Pick a concept to work through with Mentor. (Showing a plain list -- the usual roadmap view is temporarily
          unavailable.)
        </p>
        <ConceptPicker degradedConceptNames={roadmap.conceptNames} activeConceptId={requestedConceptId ?? null} />
      </div>
    );
  }

  const allNodes = roadmap.chapters.flatMap((chapter) => chapter.nodes);
  const requestedNode = requestedConceptId ? allNodes.find((n) => n.conceptId === requestedConceptId) : undefined;
  // Default to the roadmap's own "what's next" pick -- current first
  // (already in progress), then the first not-yet-covered concept --
  // rather than an arbitrary first concept in the list.
  const defaultNode = allNodes.find((n) => n.status === "current") ?? allNodes.find((n) => n.status === "next");
  const activeNode = requestedNode ?? defaultNode ?? null;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>AI Tutor</h1>

      {activeNode ? (
        <TutorWorkspace key={activeNode.conceptId} conceptId={activeNode.conceptId} conceptName={activeNode.conceptName} />
      ) : (
        <p className={styles.body}>Pick a concept below to get started.</p>
      )}

      <section className={styles.pickerSection}>
        <h2 className={styles.pickerHeading}>Choose a concept</h2>
        <ConceptPicker chapters={roadmap.chapters} activeConceptId={activeNode?.conceptId ?? null} />
      </section>
    </div>
  );
}
