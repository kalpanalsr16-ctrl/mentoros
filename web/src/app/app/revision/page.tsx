import { redirect } from "next/navigation";

/**
 * Revision Queue moved to /learning/revision (learner UI redesign),
 * sourced from real learner_concept_mastery instead of the
 * permanently-empty revision_schedule table -- see
 * lib/revision/revision-queue-aggregation.ts's doc comment. Kept as a
 * redirect so old links still resolve. The old revision_schedule-backed
 * path (lib/revision/get-revision-data.ts) is untouched and still used
 * by the Parent Portal and GET /api/student/revision -- out of scope
 * for this redesign.
 */
export default function OldRevisionPage() {
  redirect("/learning/revision");
}
