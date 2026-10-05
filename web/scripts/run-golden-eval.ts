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
import { evaluateGoldenTurn } from "../src/lib/evaluation-lab/golden-turn-evaluation";
import { generateTraceId } from "@/lib/observability/trace";
import { GOLDEN_EVAL_SET } from "../src/lib/evaluation-lab/golden-eval-set";
import { execSync } from "node:child_process";

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

/** Git short SHA, marked `-dirty` when uncommitted changes exist, so a run can't be attributed to a commit it didn't come from. */
function versionLabel(): string {
  if (process.env.EVAL_VERSION_LABEL) return process.env.EVAL_VERSION_LABEL;
  const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim().length > 0;
  return dirty ? `${sha}-dirty` : sha;
}

/** Model names read back from this run's own pipeline events, so the recorded model is what actually ran, not an assumed constant. */
async function observedModel(runId: string): Promise<string | null> {
  const { data: items } = await supabase.from("eval_run_items").select("trace_id").eq("run_id", runId);
  const traceIds = (items ?? []).map((i) => i.trace_id).filter((t): t is string => typeof t === "string");
  if (traceIds.length === 0) return null;

  const { data: events } = await supabase.from("events").select("payload").in("trace_id", traceIds);
  const models = new Set<string>();
  for (const event of events ?? []) {
    const model = (event.payload as { model?: unknown } | null)?.model;
    if (typeof model === "string") models.add(model);
  }
  return models.size > 0 ? [...models].sort().join(", ") : null;
}

async function main() {
  console.log(`Starting golden eval run (${GOLDEN_EVAL_SET.length} questions)...`);

  const { data: run, error: runError } = await supabase
    .from("eval_runs")
    .insert({
      teacher_id: EVAL_TEACHER_ID,
      label: `Golden set — ${new Date().toLocaleString()}`,
      is_public: false,
      version_label: versionLabel(),
      model: null,
    })
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

      const excerpt = pipelineResult.replyContent.slice(0, 300);
      const evaluation = await evaluateGoldenTurn(supabase, pipelineResult.deferredEvaluation);
      const latencyMs = Date.now() - startedAt;

      if (evaluation.kind === "not_evaluated") {
        await markItem(runId, golden.id, {
          status: "error",
          trace_id: traceId,
          latency_ms: latencyMs,
          response_excerpt: excerpt,
          error_message: pipelineResult.safe
            ? "No Evaluation applies to this turn (no Concept, Practice, or Assessment reply)."
            : "Message was safety-blocked -- no evaluation ran.",
        });
        console.log(`  -> error (no evaluation applies)`);
        continue;
      }

      if (evaluation.kind === "evaluation_error") {
        await markItem(runId, golden.id, {
          status: "error",
          trace_id: traceId,
          latency_ms: latencyMs,
          response_excerpt: excerpt,
          error_message: `Evaluation did not complete: ${evaluation.reason}`,
        });
        console.log(`  -> ERROR: evaluation did not complete`);
        continue;
      }

      const payload = evaluation.payload;
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

  await supabase
    .from("eval_runs")
    .update({ status: "completed", completed_at: new Date().toISOString(), model: await observedModel(runId) })
    .eq("id", runId);
  console.log(`\nRun ${runId} complete.`);
}

main();
