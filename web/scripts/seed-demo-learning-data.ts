// Seeds realistic learning history for demo.student@mentoros.app so My
// Learning has real data to render against on the public demo. Run
// manually: `npm run seed:demo-learning`.
//
// This writes directly to `events` and `learner_concept_mastery` (no
// schema changes -- both tables already have every column needed). It
// deliberately does NOT go through the real agent pipeline the way
// run-golden-eval.ts does: that would cost real LLM calls per event and
// can't precisely control the score history this needs, and this is
// account instance data, not curriculum content, so it doesn't belong in
// a migration either.
//
// Every learner_concept_mastery row's mastery_score is the exact
// arithmetic mean of that concept's own seeded assessment_completed
// scores -- the same running-average formula
// postgres-learner-profile-writer.ts's applyEvidence() uses in
// production, just computed up front here so the four numbers this
// script prints are genuinely derived from the event history it also
// writes, not picked independently of it.
//
// Note: because Knowledge Retention is a live recency-decay calculation
// (see retention-aggregation.ts), these numbers will keep drifting the
// same way a real account's would as the "last practiced" dates recede
// into the past. Re-run this script before a demo if the data has gone
// stale (retention scores lower than intended, or the 3-week trend chart
// losing buckets as events age out of the trailing 3-week window).
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { generateTraceId } from "@/lib/observability/trace";

const DEMO_STUDENT_ID = process.env.DEMO_STUDENT_ID;

if (!DEMO_STUDENT_ID) {
  console.error("Missing DEMO_STUDENT_ID");
  process.exit(1);
}

const supabase = createServiceRoleClient();
const now = new Date();

function daysAgo(days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

type SeededAssessment = {
  daysAgo: number;
  score: number; // 0-100, matches assessment_completed's own event scale
  misconceptions: string[];
};

type ConceptSeed = {
  conceptId: string;
  conceptName: string;
  firstPracticedDaysAgo: number;
  practiceQuestionCount: number;
  assessments: SeededAssessment[];
};

const CONCEPTS: ConceptSeed[] = [
  {
    conceptId: "addition-without-regrouping",
    conceptName: "Addition without regrouping",
    firstPracticedDaysAgo: 21,
    practiceQuestionCount: 6,
    assessments: [
      { daysAgo: 20, score: 80, misconceptions: [] },
      { daysAgo: 18, score: 88, misconceptions: [] },
      { daysAgo: 15, score: 90, misconceptions: [] },
      { daysAgo: 13, score: 94, misconceptions: [] },
      { daysAgo: 10, score: 96, misconceptions: [] },
      { daysAgo: 7, score: 92, misconceptions: [] },
      { daysAgo: 4, score: 95, misconceptions: [] },
      { daysAgo: 1, score: 98, misconceptions: [] },
    ],
  },
  {
    conceptId: "addition-with-regrouping",
    conceptName: "Addition with regrouping",
    firstPracticedDaysAgo: 18,
    practiceQuestionCount: 5,
    assessments: [
      { daysAgo: 18, score: 60, misconceptions: ["Forgets to carry the ten"] },
      { daysAgo: 15, score: 68, misconceptions: ["Forgets to carry the ten"] },
      { daysAgo: 11, score: 76, misconceptions: [] },
      { daysAgo: 8, score: 82, misconceptions: [] },
      { daysAgo: 4, score: 86, misconceptions: [] },
      { daysAgo: 2, score: 88, misconceptions: [] },
    ],
  },
  {
    conceptId: "subtraction-without-regrouping",
    conceptName: "Subtraction without regrouping",
    firstPracticedDaysAgo: 14,
    practiceQuestionCount: 4,
    assessments: [
      { daysAgo: 14, score: 65, misconceptions: [] },
      { daysAgo: 11, score: 72, misconceptions: [] },
      { daysAgo: 8, score: 78, misconceptions: [] },
      { daysAgo: 5, score: 82, misconceptions: [] },
      { daysAgo: 2, score: 86, misconceptions: [] },
    ],
  },
  {
    conceptId: "subtraction-with-regrouping",
    conceptName: "Subtraction with regrouping",
    firstPracticedDaysAgo: 19,
    practiceQuestionCount: 5,
    // Kept under LOW_MASTERY_THRESHOLD (0.4) on average so this concept
    // genuinely lands in the "struggling"/"needs work" status band from
    // the existing, already-approved 4-state model -- not just an
    // illustrative percentage disconnected from what the status badge
    // would actually show for this data.
    assessments: [
      { daysAgo: 19, score: 20, misconceptions: ["Borrowing across zero"] },
      { daysAgo: 16, score: 25, misconceptions: [] },
      { daysAgo: 12, score: 32, misconceptions: ["Borrowing across zero"] },
      { daysAgo: 9, score: 38, misconceptions: [] },
      { daysAgo: 6, score: 42, misconceptions: ["Borrowing across zero"] },
      { daysAgo: 3, score: 45, misconceptions: [] },
      { daysAgo: 1, score: 50, misconceptions: ["Borrowing across zero"] },
    ],
  },
];

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

async function main() {
  console.log(`Seeding My Learning demo data for student ${DEMO_STUDENT_ID}...\n`);

  const conceptIds = CONCEPTS.map((c) => c.conceptId);

  // Idempotent: clear only what this script itself would have created,
  // scoped strictly to these 4 known concept ids -- never touches the
  // demo student's other, unrelated chat history.
  const { data: existingMastery } = await supabase
    .from("learner_concept_mastery")
    .select("concept_id")
    .eq("student_id", DEMO_STUDENT_ID)
    .in("concept_id", conceptIds);
  if (existingMastery && existingMastery.length > 0) {
    await supabase.from("learner_concept_mastery").delete().eq("student_id", DEMO_STUDENT_ID).in("concept_id", conceptIds);
  }

  const { data: existingEvents } = await supabase
    .from("events")
    .select("id, payload")
    .eq("student_id", DEMO_STUDENT_ID)
    .in("event_name", ["assessment_completed", "practice_generated"]);
  const staleEventIds = (existingEvents ?? [])
    .filter((row) => conceptIds.includes((row.payload as { conceptId?: string })?.conceptId ?? ""))
    .map((row) => row.id);
  if (staleEventIds.length > 0) {
    await supabase.from("events").delete().in("id", staleEventIds);
  }

  for (const concept of CONCEPTS) {
    const scores = concept.assessments.map((a) => a.score);
    const finalMasteryScore = mean(scores) / 100;
    const lastAssessment = [...concept.assessments].sort((a, b) => a.daysAgo - b.daysAgo)[0];
    const commonMistakes = [...new Set(concept.assessments.flatMap((a) => a.misconceptions))];

    console.log(
      `${concept.conceptName}: ${Math.round(finalMasteryScore * 100)}% mastery over ${concept.assessments.length} attempts, last practiced ${lastAssessment.daysAgo}d ago`,
    );

    const practiceEvent = {
      trace_id: generateTraceId(),
      event_name: "practice_generated",
      student_id: DEMO_STUDENT_ID,
      conversation_id: null,
      payload: {
        conceptId: concept.conceptId,
        conceptName: concept.conceptName,
        model: "seed-script",
        difficulty: "Grade3",
        questionCount: concept.practiceQuestionCount,
      },
      created_at: daysAgo(concept.firstPracticedDaysAgo),
    };

    const assessmentEvents = concept.assessments.map((a) => ({
      trace_id: generateTraceId(),
      event_name: "assessment_completed",
      student_id: DEMO_STUDENT_ID,
      conversation_id: null,
      payload: {
        conceptId: concept.conceptId,
        conceptName: concept.conceptName,
        model: "seed-script",
        masteryScore: a.score,
        status: a.score >= 80 ? "Proficient" : a.score >= 60 ? "Developing" : "NeedsSupport",
        recommendedNextStep: a.score >= 80 ? "AdvanceToNextTopic" : "GenerateMorePractice",
        misconceptionCount: a.misconceptions.length,
        misconceptions: a.misconceptions,
        feedback: `Seeded demo assessment result (${a.score}%).`,
      },
      created_at: daysAgo(a.daysAgo),
    }));

    const { error: eventsError } = await supabase.from("events").insert([practiceEvent, ...assessmentEvents]);
    if (eventsError) {
      console.error(`  failed to insert events for ${concept.conceptId}:`, eventsError.message);
      process.exit(1);
    }

    const { error: masteryError } = await supabase.from("learner_concept_mastery").insert({
      student_id: DEMO_STUDENT_ID,
      concept_id: concept.conceptId,
      mastery_score: finalMasteryScore,
      attempts: concept.assessments.length,
      last_practiced_at: daysAgo(lastAssessment.daysAgo),
      common_mistakes: commonMistakes,
      created_at: daysAgo(concept.firstPracticedDaysAgo),
      updated_at: daysAgo(lastAssessment.daysAgo),
    });
    if (masteryError) {
      console.error(`  failed to insert learner_concept_mastery for ${concept.conceptId}:`, masteryError.message);
      process.exit(1);
    }
  }

  console.log("\nDone. Visit /learning as demo.student@mentoros.app to see it.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
