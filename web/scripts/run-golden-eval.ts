// Golden-set evaluation harness (run manually: `npm run eval:golden`).
//
// Sends every question in golden-eval-set.ts through the real
// Safety -> Router -> Concept/Practice/Assessment -> Evaluation Agent
// pipeline (the exact same runTutoringPipeline() /api/chat uses -- no
// mocked scores), driven by a dedicated eval-bot account so this never
// touches the public demo student's chat history or its daily message
// cap. Each question's result is written to eval_run_items as soon as
// it completes, so a teacher watching /studio/evaluation/runs (or a
// visitor on the public /eval page) sees pass/fail land live while this
// script is still running.
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createStreamingEventBuilder } from "@/lib/chat/streaming-event-builder";
import { createPostgresKnowledgeProvider } from "@/lib/knowledge/postgres-knowledge-provider";
import { createTrigramConceptSearchProvider } from "@/lib/knowledge/trigram-concept-search-provider";
import { createPostgresLearnerStateProvider } from "@/lib/learner/postgres-learner-state-provider";
import { createPostgresLearnerProfileWriter } from "@/lib/learner/postgres-learner-profile-writer";
import { runTutoringPipeline } from "@/app/api/chat/route";
import { generateTraceId } from "@/lib/observability/trace";
import { GOLDEN_EVAL_SET } from "./golden-eval-set";

const EVAL_BOT_STUDENT_ID = process.env.EVAL_BOT_STUDENT_ID;
const EVAL_TEACHER_ID = process.env.EVAL_TEACHER_ID;

if (!EVAL_BOT_STUDENT_ID || !EVAL_TEACHER_ID) {
  console.error("Missing EVAL_BOT_STUDENT_ID or EVAL_TEACHER_ID");
  process.exit(1);
}

const supabase = createServiceRoleClient();

/** The pipeline streams progress to a real SSE controller; this harness
 * has no live client, so it hands it a controller wired to a stream it
 * drains and discards. */
function createDiscardingEventsSink() {
  let controllerRef!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
  });
  (async () => {
    const reader = stream.getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) break;
    }
  })().catch(() => {});
  return createStreamingEventBuilder(controllerRef);
}

type EvaluationCompletedPayload = {
  sourceAgent: string;
  overallScore: number;
  groundedness: number | null;
  accuracy: number;
  safety: number;
  hallucinationRisk: string | null;
};

async function markItem(runId: string, goldenId: string, fields: Record<string, unknown>) {
  const { error } = await supabase
    .from("eval_run_items")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("run_id", runId)
    .eq("golden_id", goldenId);
  if (error) {
    console.error(`  failed to update eval_run_items for ${goldenId}:`, error.message);
  }
}

async function main() {
  console.log(`Starting golden eval run (${GOLDEN_EVAL_SET.length} questions)...`);

  const { data: run, error: runError } = await supabase
    .from("eval_runs")
    .insert({ teacher_id: EVAL_TEACHER_ID, label: `Golden set — ${new Date().toLocaleString()}`, is_public: true })
    .select("id")
    .single();

  if (runError || !run) {
    console.error("Failed to create eval_runs row:", runError?.message);
    process.exit(1);
  }

  const runId = run.id as string;
  console.log(`Run id: ${runId}\n`);

  const { error: seedError } = await supabase.from("eval_run_items").insert(
    GOLDEN_EVAL_SET.map((g) => ({ run_id: runId, golden_id: g.id, question: g.question, status: "pending" })),
  );
  if (seedError) {
    console.error("Failed to seed eval_run_items:", seedError.message);
    process.exit(1);
  }

  const knowledgeProvider = createPostgresKnowledgeProvider(supabase);
  const conceptSearchProvider = createTrigramConceptSearchProvider(supabase);
  const learnerStateProvider = createPostgresLearnerStateProvider(supabase);
  const learnerProfileWriter = createPostgresLearnerProfileWriter(supabase);

  for (const golden of GOLDEN_EVAL_SET) {
    console.log(`[${golden.id}] "${golden.question}"`);
    await markItem(runId, golden.id, { status: "running" });

    const traceId = generateTraceId();
    const startedAt = Date.now();

    try {
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({ student_id: EVAL_BOT_STUDENT_ID })
        .select("id")
        .single();
      if (conversationError || !conversation) {
        throw new Error(conversationError?.message ?? "conversation insert failed");
      }

      const { error: messageError } = await supabase
        .from("messages")
        .insert({ conversation_id: conversation.id, role: "user", content: golden.question });
      if (messageError) throw new Error(messageError.message);

      const pipelineResult = await runTutoringPipeline({
        supabase,
        traceId,
        studentId: EVAL_BOT_STUDENT_ID!,
        activeConversationId: conversation.id,
        content: golden.question,
        events: createDiscardingEventsSink(),
        knowledgeProvider,
        conceptSearchProvider,
        learnerStateProvider,
        learnerProfileWriter,
        signal: AbortSignal.timeout(120_000),
      });

      const latencyMs = Date.now() - startedAt;
      const excerpt = pipelineResult.replyContent.slice(0, 300);

      const { data: evalEvent } = await supabase
        .from("events")
        .select("payload")
        .eq("trace_id", traceId)
        .eq("event_name", "evaluation_completed")
        .maybeSingle();

      if (!evalEvent) {
        await markItem(runId, golden.id, {
          status: "error",
          trace_id: traceId,
          latency_ms: latencyMs,
          response_excerpt: excerpt,
          error_message: pipelineResult.safe
            ? "No evaluation_completed event was logged for this trace."
            : "Message was safety-blocked -- no evaluation ran.",
        });
        console.log(`  -> error (no evaluation event)`);
        continue;
      }

      const payload = evalEvent.payload as EvaluationCompletedPayload;
      const threshold = golden.minOverallScore ?? 70;
      const pass = payload.overallScore >= threshold;

      await markItem(runId, golden.id, {
        status: pass ? "pass" : "fail",
        trace_id: traceId,
        source_agent: payload.sourceAgent,
        latency_ms: latencyMs,
        overall_score: payload.overallScore,
        groundedness_score: payload.groundedness,
        accuracy_score: payload.accuracy,
        safety_score: payload.safety,
        hallucination_risk: payload.hallucinationRisk,
        response_excerpt: excerpt,
      });

      console.log(
        `  -> ${pass ? "PASS" : "FAIL"} overall=${payload.overallScore} latency=${latencyMs}ms agent=${payload.sourceAgent}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      await markItem(runId, golden.id, {
        status: "error",
        trace_id: traceId,
        latency_ms: Date.now() - startedAt,
        error_message: message,
      });
      console.log(`  -> ERROR: ${message}`);
    }
  }

  await supabase.from("eval_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", runId);
  console.log(`\nRun ${runId} complete.`);
}

main();
