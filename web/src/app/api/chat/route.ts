import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";
import { checkMessageSafety, buildSafetyDeclineMessage } from "@/lib/safety/filter";
import { buildConversationContext, type ClaudeMessage } from "@/lib/agents/context-agent";
import {
  generateTeachingReplyStreaming,
  classifyIntentWithClaude,
  classifySafetyWithClaude,
  generateConceptExplanation,
  generatePracticeSet,
  generateAssessment,
  generateReflection,
  generateEvaluation,
  estimateCostUsd,
  type ConceptAgentResult,
  type PracticeAgentResult,
  type AssessmentAgentResult,
} from "@/lib/llm/client";
import { evaluateSafety } from "@/lib/agents/safety-agent";
import {
  evaluateInteraction,
  type EvaluationAgentContext,
  type EvaluationSourceAgent,
} from "@/lib/agents/evaluation-agent";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { classifyIntent } from "@/lib/agents/router-agent";
import { buildPlanningContext, decidePlan, type LearningPlan } from "@/lib/agents/planning-agent";
import {
  decidePersonalization,
  describePersonalizationForPrompt,
  type PersonalizationProfile,
} from "@/lib/agents/personalization-agent";
import {
  explainConcept,
  formatTeachingResponseAsReply,
  type ConceptAgentContext,
} from "@/lib/agents/concept-agent";
import {
  createPracticeSet,
  formatPracticeSetAsReply,
  type PracticeAgentContext,
  type PracticeSet,
} from "@/lib/agents/practice-agent";
import {
  evaluateResponse,
  formatAssessmentReportAsReply,
  extractPracticeContext,
  type AssessmentAgentContext,
  type AssessmentReport,
} from "@/lib/agents/assessment-agent";
import { reflectOnSession, type ReflectionAgentContext } from "@/lib/agents/reflection-agent";
import { updateLearnerProfile, type MemoryAgentContext } from "@/lib/agents/memory-agent";
import { createPostgresLearnerStateProvider } from "@/lib/learner/postgres-learner-state-provider";
import { createPostgresLearnerProfileWriter } from "@/lib/learner/postgres-learner-profile-writer";
import { createPostgresKnowledgeProvider } from "@/lib/knowledge/postgres-knowledge-provider";
import { createTrigramConceptSearchProvider } from "@/lib/knowledge/trigram-concept-search-provider";
import type { PlanningContext } from "@/lib/agents/planning-context";
import type { Concept } from "@/lib/knowledge/curriculum-types";
import type { ReplyKind, MasteryUpdatePayload, MessageRow } from "@/lib/chat/types";
import { createStreamingEventBuilder, type StreamingEventBuilder } from "@/lib/chat/streaming-event-builder";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Everything a Retry needs beyond a normal send: which row to mark
 * superseded before regenerating, per the append-only decision (Sprint
 * 4) -- retry never overwrites `content` on an existing row, it always
 * inserts a fresh assistant message and hides the old one from the
 * default conversation view instead.
 */
type RetryTarget = { supersedeMessageId: string };

export async function POST(request: Request) {
  const traceId = generateTraceId();
  const supabase = await createClient();

  // Composition root: today's concrete KnowledgeProvider/ConceptSearchProvider
  // are Postgres-backed (M5A/M5B), constructed per-request since they need
  // this request's RLS-scoped client. Planning Agent itself never imports
  // either concrete implementation -- swapping to a future real-semantic
  // search provider, or a caching KnowledgeProvider, only changes this one
  // wiring point, per the M3/M5 design agreements.
  const knowledgeProvider = createPostgresKnowledgeProvider(supabase);
  const conceptSearchProvider = createTrigramConceptSearchProvider(supabase);

  // M8: real learner state, replacing unknownLearnerStateProvider now
  // that Memory Agent (below) actually writes something here.
  const learnerStateProvider = createPostgresLearnerStateProvider(supabase);
  const learnerProfileWriter = createPostgresLearnerProfileWriter(supabase);

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    // No authenticated student to attach this event to, and the events
    // table's RLS policy requires student_id = auth.uid() -- an
    // unauthenticated attempt can't be logged there. Nothing to log.
    return Response.json({ error: "Not signed in.", traceId }, { status: 401 });
  }

  const studentId = claimsData.claims.sub as string;

  // Checked before any other work -- every message now costs a real
  // Claude API call (M1-04), so a student over the limit shouldn't pay
  // for a safety check, a conversation lookup, or a message insert on a
  // request that's about to be rejected anyway.
  const rateLimitResult = await checkRateLimit(supabase);
  if (rateLimitResult.limited) {
    await logEvent(supabase, {
      traceId,
      eventName: "rate_limited",
      studentId,
      payload: { count: rateLimitResult.count },
    });
    return Response.json(
      { error: "You're sending messages too quickly. Please wait a moment and try again.", traceId },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const isRetry = body?.retry === true;
  const bodyConversationId =
    typeof body?.conversationId === "string" ? body.conversationId : null;

  let activeConversationId: string;
  let content: string;
  let userMessage: MessageRow;
  let retryTarget: RetryTarget | null = null;

  if (isRetry) {
    // Retry (Sprint 4): "same context" per docs/ui-architecture/
    // 05_Chat_Experience.md's Message actions section -- no new user
    // message, the pipeline re-runs against the conversation's existing
    // last turn. Requires an existing conversation; there's nothing to
    // retry in a brand-new one.
    if (!bodyConversationId) {
      return Response.json({ error: "conversationId is required to retry.", traceId }, { status: 400 });
    }
    activeConversationId = bodyConversationId;

    const { data: lastAssistant } = await supabase
      .from("messages")
      .select("id, role, content, trace_id")
      .eq("conversation_id", activeConversationId)
      .eq("role", "assistant")
      .is("superseded_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastUser } = await supabase
      .from("messages")
      .select("id, role, content, trace_id")
      .eq("conversation_id", activeConversationId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastAssistant || !lastUser) {
      return Response.json({ error: "Nothing to retry.", traceId }, { status: 400 });
    }

    content = lastUser.content;
    userMessage = lastUser;
    retryTarget = { supersedeMessageId: lastAssistant.id };
  } else {
    content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return Response.json({ error: "Message content is required.", traceId }, { status: 400 });
    }

    activeConversationId = bodyConversationId ?? "";

    if (!activeConversationId) {
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({ student_id: studentId })
        .select("id")
        .single();

      if (conversationError || !conversation) {
        await logEvent(supabase, {
          traceId,
          eventName: "message_rejected",
          studentId,
          payload: { reason: "conversation_create_failed" },
        });
        return Response.json({ error: "Could not start a new conversation.", traceId }, { status: 500 });
      }

      activeConversationId = conversation.id;
    }

    // The unsafe message is still saved -- it's part of the real
    // conversation history and needs to be reviewable (a parent or
    // reviewer must be able to see what was said and how MentorOS
    // responded), even though the reply it gets is a decline, not the
    // usual placeholder.
    const { data: insertedUserMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "user",
        content,
      })
      .select("id, role, content, trace_id")
      .single();

    if (userMessageError || !insertedUserMessage) {
      // Most likely cause: activeConversationId doesn't belong to this
      // student, and Row Level Security silently rejected the insert.
      await logEvent(supabase, {
        traceId,
        eventName: "message_rejected",
        studentId,
        conversationId: activeConversationId,
        payload: { reason: "user_message_save_failed" },
      });
      return Response.json({ error: "Could not save your message.", traceId }, { status: 403 });
    }

    userMessage = insertedUserMessage;
  }

  if (retryTarget) {
    // Marked BEFORE buildConversationContext runs (inside runTutoringPipeline
    // below) so the regenerated reply's history naturally excludes the
    // attempt it's replacing -- append-only per Sprint 4's explicit
    // decision: this UPDATE only ever touches `superseded_at`, never
    // `content` or `trace_id` on the superseded row.
    const { error: supersedeError } = await supabase
      .from("messages")
      .update({ superseded_at: new Date().toISOString() })
      .eq("id", retryTarget.supersedeMessageId);

    if (supersedeError) {
      return Response.json({ error: "Could not prepare retry.", traceId }, { status: 500 });
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const events = createStreamingEventBuilder(controller);

      try {
        const pipelineResult = await runTutoringPipeline({
          supabase,
          traceId,
          studentId,
          activeConversationId,
          content,
          events,
          knowledgeProvider,
          conceptSearchProvider,
          learnerStateProvider,
          learnerProfileWriter,
          signal: request.signal,
        });

        // Epic B3: assistant rows can no longer be inserted via a plain
        // table insert under the student's own session (RLS now rejects
        // role: 'assistant' outright) -- this SECURITY DEFINER RPC is the
        // one legitimate path, and re-checks conversation ownership itself
        // since it runs with elevated privilege.
        const { data: assistantMessage, error: assistantMessageError } = await supabase
          .rpc("insert_assistant_message", {
            p_conversation_id: activeConversationId,
            p_content: pipelineResult.replyContent,
            // Sprint 3: lets the AI Transparency Panel look up this turn's
            // trace after a page reload.
            p_trace_id: traceId,
          })
          .returns<MessageRow[]>()
          .single();

        if (assistantMessageError || !assistantMessage) {
          await logEvent(supabase, {
            traceId,
            eventName: "reply_failed",
            studentId,
            conversationId: activeConversationId,
            payload: {
              reason: "assistant_message_save_failed",
              userMessageId: userMessage.id,
            },
          });
          events.error("Could not save the reply.");
          return;
        }

        await logEvent(supabase, {
          traceId,
          eventName: pipelineResult.safe ? "reply_sent" : "safety_reply_sent",
          studentId,
          conversationId: activeConversationId,
          payload: {
            userMessageId: userMessage.id,
            assistantMessageId: assistantMessage.id,
            ...pipelineResult.llmMetadata,
          },
        });

        events.state("Completed");
        events.done({
          conversationId: activeConversationId,
          userMessage,
          assistantMessage,
          traceId,
          // Additive, response-only fields (Sprint 2) -- see ReplyKind's doc
          // comment above. Omitted (not null) when not applicable, so existing
          // consumers that only read assistantMessage.content are unaffected.
          replyKind: pipelineResult.replyKind,
          ...(pipelineResult.practiceSetPayload ? { practiceSet: pipelineResult.practiceSetPayload } : {}),
          ...(pipelineResult.assessmentReportPayload
            ? { assessmentReport: pipelineResult.assessmentReportPayload }
            : {}),
          ...(pipelineResult.masteryUpdatePayload ? { masteryUpdate: pipelineResult.masteryUpdatePayload } : {}),
        });
      } catch (err) {
        events.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        events.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Shown when the Claude API call itself fails (rate limit, timeout,
// outage) -- an honest, persisted turn rather than a raw crash or a
// silently missing reply. See Task 5 notes in
// docs/implementation/M1-04-Chat-Route-Integration.md.
function buildLLMFailureReply(): string {
  return "I'm having trouble responding right now. Please try sending your message again in a moment.";
}

type PipelineResult = {
  replyContent: string;
  replyKind: ReplyKind;
  llmMetadata: Record<string, unknown>;
  safe: boolean;
  practiceSetPayload?: PracticeSet;
  assessmentReportPayload?: AssessmentReport;
  masteryUpdatePayload?: MasteryUpdatePayload;
};

/**
 * The full Safety -> Router -> Planning -> Concept/Practice/Assessment ->
 * Reflection -> Memory pipeline, extracted from the route handler (Sprint
 * 4) so POST() stays focused on request/response plumbing (auth, retry
 * setup, opening the stream) rather than agent orchestration living
 * inline inside a ReadableStream callback. Decision logic here is
 * byte-for-byte the same as before Sprint 4 -- the only additions are the
 * `events.state(...)` calls at the two real phase boundaries (Thinking
 * once Safety/Router/Planning start, Teaching once generation starts) and
 * routing the one streamable path (generateTeachingReplyStreaming) through
 * `events.chunk(...)` instead of waiting for a complete response.
 */
async function runTutoringPipeline(params: {
  supabase: SupabaseServerClient;
  traceId: string;
  studentId: string;
  activeConversationId: string;
  content: string;
  events: StreamingEventBuilder;
  knowledgeProvider: ReturnType<typeof createPostgresKnowledgeProvider>;
  conceptSearchProvider: ReturnType<typeof createTrigramConceptSearchProvider>;
  learnerStateProvider: ReturnType<typeof createPostgresLearnerStateProvider>;
  learnerProfileWriter: ReturnType<typeof createPostgresLearnerProfileWriter>;
  signal: AbortSignal;
}): Promise<PipelineResult> {
  const {
    supabase,
    traceId,
    studentId,
    activeConversationId,
    content,
    events,
    knowledgeProvider,
    conceptSearchProvider,
    learnerStateProvider,
    learnerProfileWriter,
    signal,
  } = params;

  events.state("Thinking");

  // Layer 1 of M9's Safety Agent -- the M0 keyword filter, free and
  // deterministic. Computed here (before history even exists) so a
  // message it already flags never pays for a conversation lookup it
  // won't need history for; Layer 2 (below, after the message is saved)
  // only runs when this passes.
  const layer1Result = checkMessageSafety(content);

  // Built after the user message (or, on Retry, the superseded-reply
  // update) above has already landed, so the history the model sees
  // naturally ends with the message being answered -- needed here (not
  // just later) since Layer 2 of Safety Agent (M9) reasons over the
  // Context Object, per 03_Safety_Agent.md's Inputs section. Skipped
  // (and Layer 2 never called) when Layer 1 already flagged the message
  // -- evaluateSafety() short-circuits before ever touching `history` or
  // `classify` in that case.
  const history = layer1Result.safe
    ? await buildConversationContext(supabase, activeConversationId)
    : [];

  // Safety Agent (M9): the first agent to touch this message, running
  // before Router/Planning/Knowledge Retrieval/Concept Agent -- per
  // 03_Safety_Agent.md's 2026-07-12 Revision note. Enforces exactly two
  // outcomes (Allow/Block, per 11_Policy_Engine.md's Enforcement
  // Actions), fails CLOSED (not open) on its own Layer 2 call failure --
  // see safety-agent.ts's doc comment for why this is the one
  // intentional exception to this codebase's fail-open convention.
  const safetyStartedAt = Date.now();
  const safetyAssessment = await evaluateSafety(history, layer1Result, classifySafetyWithClaude);
  const safetyLatencyMs = Date.now() - safetyStartedAt;

  // model/inputTokens/outputTokens are only present when Layer 2's Claude
  // call actually ran and succeeded -- undefined (and omitted below) when
  // Layer 1 alone decided the outcome, so this event never claims a cost
  // that wasn't actually incurred.
  const safetyCallMetadata =
    safetyAssessment.model !== undefined
      ? {
          model: safetyAssessment.model,
          inputTokens: safetyAssessment.inputTokens,
          outputTokens: safetyAssessment.outputTokens,
          estimatedCostUsd: estimateCostUsd(
            safetyAssessment.inputTokens!,
            safetyAssessment.outputTokens!,
          ),
          latencyMs: safetyLatencyMs,
        }
      : { latencyMs: safetyLatencyMs };

  await logEvent(supabase, {
    traceId,
    eventName: safetyAssessment.safe ? "message_received" : "safety_blocked",
    studentId,
    conversationId: activeConversationId,
    payload: safetyAssessment.safe
      ? {
          riskLevel: safetyAssessment.riskLevel,
          confidence: safetyAssessment.confidence,
          contentLength: content.length,
          ...safetyCallMetadata,
        }
      : {
          category: safetyAssessment.category,
          riskLevel: safetyAssessment.riskLevel,
          confidence: safetyAssessment.confidence,
          contentLength: content.length,
          ...safetyCallMetadata,
        },
  });

  let replyContent: string;
  let llmMetadata: Record<string, unknown> = {};
  let replyKind: ReplyKind = "text";
  let practiceSetPayload: PracticeSet | undefined;
  let assessmentReportPayload: AssessmentReport | undefined;
  let masteryUpdatePayload: MasteryUpdatePayload | undefined;

  if (!safetyAssessment.safe) {
    // Blocked messages never reach Router/Planning/Concept Agent at all
    // -- Safety Agent is the gate, not a pre-check the rest of the
    // pipeline could still be argued past. Zero further Anthropic API
    // calls for blocked content, by design.
    replyContent = buildSafetyDeclineMessage(safetyAssessment.category ?? "platform_abuse");
    replyKind = "safety_decline";
  } else {
    // Router Agent (M2): intent analysis only -- it never generates a
    // teaching reply itself. It decides whether this message needs
    // clarification; when it doesn't, the existing M1 reply path below
    // runs unchanged. A router failure fails open into that same M1 path
    // rather than blocking the message, since routing is an enhancement
    // layered on top of M1, not a new hard dependency of the chat route.
    const routerStartedAt = Date.now();
    const routerResult = await classifyIntent(history, classifyIntentWithClaude);
    const routerLatencyMs = Date.now() - routerStartedAt;

    if (routerResult.success) {
      await logEvent(supabase, {
        traceId,
        eventName: "intent_detected",
        studentId,
        conversationId: activeConversationId,
        payload: {
          primaryIntent: routerResult.intent.primaryIntent,
          secondaryIntent: routerResult.intent.secondaryIntent,
          confidence: routerResult.intent.confidence,
          topic: routerResult.intent.topic,
          subtopic: routerResult.intent.subtopic,
          clarificationRequired: routerResult.intent.needsClarification,
          model: routerResult.model,
          inputTokens: routerResult.inputTokens,
          outputTokens: routerResult.outputTokens,
          estimatedCostUsd: estimateCostUsd(routerResult.inputTokens, routerResult.outputTokens),
          latencyMs: routerLatencyMs,
        },
      });
    } else {
      await logEvent(supabase, {
        traceId,
        eventName: "routing_failed",
        studentId,
        conversationId: activeConversationId,
        payload: { reason: routerResult.reason, latencyMs: routerLatencyMs },
      });
    }

    if (routerResult.success && routerResult.intent.needsClarification) {
      replyContent = routerResult.intent.clarificationQuestion!;
      llmMetadata = { isClarification: true };
    } else {
      // Planning Agent (M3) + Personalization Agent (M4): only run once
      // Router has produced a non-clarification intent. Fails open into
      // an unguided M1 reply on any error -- both are enhancements
      // layered on top of M1's existing reply generation, not a new hard
      // dependency. Personalization's profile -- not Planning's raw
      // guidance -- is what reaches generateTeachingReply(), per
      // Personalization's own spec describing itself as the single
      // source of truth for how teaching should feel; Planning's output
      // still feeds that decision, just not the prompt directly.
      //
      // planningContext/plan/profile are hoisted here (not scoped to the
      // try block) because M7's Practice/Assessment branches below need
      // them too, alongside M6's Concept Agent -- all three read the same
      // Planning/Personalization output, they just differ in which one
      // actually runs for a given turn.
      let teachingGuidance: string | undefined;
      let planningContext: PlanningContext | undefined;
      let plan: LearningPlan | undefined;
      let profile: PersonalizationProfile | undefined;
      if (routerResult.success) {
        try {
          planningContext = await buildPlanningContext(
            routerResult.intent,
            studentId,
            learnerStateProvider,
            knowledgeProvider,
            conceptSearchProvider,
          );
          plan = decidePlan(planningContext);

          await logEvent(supabase, {
            traceId,
            eventName: "learning_plan_created",
            studentId,
            conversationId: activeConversationId,
            payload: {
              strategy: plan.strategy,
              difficulty: plan.difficulty,
              pace: plan.pace,
              followUpRequired: plan.followUpRequired,
              conceptResolved: planningContext.concept !== null,
            },
          });

          profile = decidePersonalization({ planningContext, plan });
          teachingGuidance = describePersonalizationForPrompt(profile);

          await logEvent(supabase, {
            traceId,
            eventName: "personalization_profile_created",
            studentId,
            conversationId: activeConversationId,
            payload: {
              teachingStyle: profile.teachingStyle,
              difficulty: profile.difficulty,
              pace: profile.pace,
              exampleStyle: profile.exampleStyle,
              encouragement: profile.encouragement,
              hintLevel: profile.hintLevel,
            },
          });
        } catch (err) {
          await logEvent(supabase, {
            traceId,
            eventName: "planning_failed",
            studentId,
            conversationId: activeConversationId,
            payload: {
              reason: err instanceof Error ? err.message : "unknown_error",
            },
          });
        }
      }

      events.state("Teaching");
      const llmStartedAt = Date.now();

      // Practice Agent (M7): gated on Router's own "Practice"
      // classification, not Planning's Diagnostic/ConceptFirst/etc.
      // strategy -- an explicit "give me practice questions" request is a
      // distinct kind of turn from "explain this to me," and Planning's
      // Diagnostic judgment is about whether to diagnose before
      // explaining, not whether to refuse a direct practice request.
      // Unlike Concept Agent, this is NOT gated on plan.strategy, so it
      // actually fires live today rather than waiting on M8's learner
      // state writer. Still requires a resolved concept, since Practice
      // Agent's own Inputs section requires a Knowledge Package to
      // generate aligned questions from.
      let practiceResult: PracticeAgentResult | undefined;
      if (
        routerResult.success &&
        routerResult.intent.primaryIntent === "Practice" &&
        planningContext?.concept &&
        plan &&
        profile
      ) {
        const practiceAgentContext: PracticeAgentContext = {
          concept: planningContext.concept,
          learningObjectives: planningContext.learningObjectives,
          misconceptions: planningContext.misconceptions,
          teachingStrategies: planningContext.teachingStrategies,
          plan,
          personalizationProfile: profile,
          history,
        };
        practiceResult = await createPracticeSet(practiceAgentContext, generatePracticeSet);
      }

      // Assessment Agent (M7): same Router-intent gate as Practice, not
      // Planning's Diagnostic strategy. `concept` is optional here --
      // Assessment can still evaluate a free-form answer without one,
      // unlike Practice/Concept Agent which need a Knowledge Package to
      // generate from.
      let assessmentResult: AssessmentAgentResult | undefined;
      if (
        routerResult.success &&
        routerResult.intent.primaryIntent === "Assessment" &&
        plan &&
        profile
      ) {
        const assessmentAgentContext: AssessmentAgentContext = {
          concept: planningContext?.concept ?? null,
          learningObjectives: planningContext?.learningObjectives ?? [],
          misconceptions: planningContext?.misconceptions ?? [],
          practiceContext: extractPracticeContext(history),
          plan,
          personalizationProfile: profile,
          history,
        };
        assessmentResult = await evaluateResponse(assessmentAgentContext, generateAssessment);
      }

      // Concept Agent (M6): only when this turn wasn't already claimed by
      // Practice or Assessment above, and (unlike them) only once Planning
      // has decided this isn't a diagnostic moment -- per
      // 05_Planning_agent.md's Recovery Strategy ("If learner profile is
      // incomplete: ask diagnostic questions"), Diagnostic means diagnose,
      // not teach.
      let conceptResult: ConceptAgentResult | undefined;
      if (
        !practiceResult &&
        !assessmentResult &&
        plan &&
        plan.strategy !== "Diagnostic" &&
        planningContext?.concept &&
        profile
      ) {
        const conceptAgentContext: ConceptAgentContext = {
          concept: planningContext.concept,
          learningObjectives: planningContext.learningObjectives,
          misconceptions: planningContext.misconceptions,
          teachingStrategies: planningContext.teachingStrategies,
          plan,
          personalizationProfile: profile,
          history,
        };
        conceptResult = await explainConcept(conceptAgentContext, generateConceptExplanation);
      }

      const llmLatencyMs = Date.now() - llmStartedAt;

      if (practiceResult?.success) {
        await logEvent(supabase, {
          traceId,
          eventName: "practice_generated",
          studentId,
          conversationId: activeConversationId,
          payload: {
            model: practiceResult.model,
            difficulty: practiceResult.response.difficulty,
            questionCount: practiceResult.response.questions.length,
            inputTokens: practiceResult.inputTokens,
            outputTokens: practiceResult.outputTokens,
            estimatedCostUsd: estimateCostUsd(practiceResult.inputTokens, practiceResult.outputTokens),
            latencyMs: llmLatencyMs,
          },
        });

        replyContent = formatPracticeSetAsReply(practiceResult.response);
        replyKind = "practice";
        practiceSetPayload = practiceResult.response;

        await runEvaluationAgent(supabase, {
          traceId,
          studentId,
          conversationId: activeConversationId,
          sourceAgent: "Practice",
          responseText: replyContent,
          concept: planningContext?.concept ?? null,
          personalizationProfile: profile!,
          latencyMs: llmLatencyMs,
          history,
        });
      } else if (assessmentResult?.success) {
        await logEvent(supabase, {
          traceId,
          eventName: "assessment_completed",
          studentId,
          conversationId: activeConversationId,
          payload: {
            model: assessmentResult.model,
            masteryScore: assessmentResult.response.masteryScore,
            status: assessmentResult.response.status,
            recommendedNextStep: assessmentResult.response.recommendedNextStep,
            misconceptionCount: assessmentResult.response.misconceptions.length,
            inputTokens: assessmentResult.inputTokens,
            outputTokens: assessmentResult.outputTokens,
            estimatedCostUsd: estimateCostUsd(assessmentResult.inputTokens, assessmentResult.outputTokens),
            latencyMs: llmLatencyMs,
          },
        });

        replyContent = formatAssessmentReportAsReply(assessmentResult.response);
        replyKind = "assessment";
        assessmentReportPayload = assessmentResult.response;

        await runEvaluationAgent(supabase, {
          traceId,
          studentId,
          conversationId: activeConversationId,
          sourceAgent: "Assessment",
          responseText: replyContent,
          concept: planningContext?.concept ?? null,
          personalizationProfile: profile!,
          latencyMs: llmLatencyMs,
          history,
        });

        // Reflection Agent + Memory Agent (M8): run only after a
        // successful Assessment -- AssessmentCompleted is Reflection's
        // own documented trigger event (11_Reflection_Agent.md), and
        // it's the only concrete trigger that exists in this pipeline
        // (no SessionEnding concept exists anywhere in MentorOS yet).
        // Entirely internal -- doesn't change replyContent, which stays
        // exactly the Assessment feedback above. Wrapped in one try/catch
        // so a failure here never affects the reply already decided.
        try {
          const reflectionAgentContext: ReflectionAgentContext = {
            concept: planningContext?.concept ?? null,
            assessmentReport: assessmentResult.response,
            learnerState: planningContext?.learnerState ?? { isKnown: false },
            history,
          };
          const reflectionStartedAt = Date.now();
          const reflectionResult = await reflectOnSession(reflectionAgentContext, generateReflection);
          const reflectionLatencyMs = Date.now() - reflectionStartedAt;

          if (reflectionResult.success) {
            await logEvent(supabase, {
              traceId,
              eventName: "reflection_completed",
              studentId,
              conversationId: activeConversationId,
              payload: {
                model: reflectionResult.model,
                learningStatus: reflectionResult.response.learningStatus,
                confidence: reflectionResult.response.confidence,
                recommendedAction: reflectionResult.response.recommendedAction,
                inputTokens: reflectionResult.inputTokens,
                outputTokens: reflectionResult.outputTokens,
                estimatedCostUsd: estimateCostUsd(
                  reflectionResult.inputTokens,
                  reflectionResult.outputTokens,
                ),
                latencyMs: reflectionLatencyMs,
              },
            });
          } else {
            await logEvent(supabase, {
              traceId,
              eventName: "reflection_failed",
              studentId,
              conversationId: activeConversationId,
              payload: { reason: reflectionResult.reason, latencyMs: reflectionLatencyMs },
            });
          }

          // Memory Agent still has real evidence from Assessment alone
          // even when Reflection failed above -- it isn't discarded.
          const memoryAgentContext: MemoryAgentContext = {
            studentId,
            conceptId: planningContext?.concept?.id ?? null,
            assessmentReport: assessmentResult.response,
            reflectionReport: reflectionResult.success ? reflectionResult.response : null,
          };
          const memoryResult = await updateLearnerProfile(memoryAgentContext, learnerProfileWriter);

          if (memoryResult.applied && memoryResult.evidence) {
            await logEvent(supabase, {
              traceId,
              eventName: "learner_profile_updated",
              studentId,
              conversationId: activeConversationId,
              payload: {
                conceptId: memoryResult.evidence.conceptId,
                masteryScore: memoryResult.evidence.masteryScore,
              },
            });

            // Surfaced to the client as a small, quiet inline note
            // (docs/ui-architecture/05_Chat_Experience.md's "Memory
            // updates" section) -- only when mastery genuinely changed,
            // never on every turn. `masteryScore` here is the 0-1 scale
            // learner_concept_mastery stores (see learner-profile-writer.ts);
            // x100 to match AssessmentReport's 0-100 display convention.
            masteryUpdatePayload = {
              conceptId: memoryResult.evidence.conceptId,
              conceptName: planningContext?.concept?.name ?? "this concept",
              masteryScore: Math.round(memoryResult.evidence.masteryScore * 100),
            };
          }
        } catch (err) {
          await logEvent(supabase, {
            traceId,
            eventName: "memory_update_failed",
            studentId,
            conversationId: activeConversationId,
            payload: { reason: err instanceof Error ? err.message : "unknown_error" },
          });
        }
      } else if (conceptResult?.success) {
        await logEvent(supabase, {
          traceId,
          eventName: "concept_explained",
          studentId,
          conversationId: activeConversationId,
          payload: {
            model: conceptResult.model,
            nextStep: conceptResult.response.nextStep,
            confidence: conceptResult.response.confidence,
            inputTokens: conceptResult.inputTokens,
            outputTokens: conceptResult.outputTokens,
            estimatedCostUsd: estimateCostUsd(conceptResult.inputTokens, conceptResult.outputTokens),
            latencyMs: llmLatencyMs,
          },
        });

        replyContent = formatTeachingResponseAsReply(conceptResult.response);

        await runEvaluationAgent(supabase, {
          traceId,
          studentId,
          conversationId: activeConversationId,
          sourceAgent: "Concept",
          responseText: replyContent,
          concept: planningContext?.concept ?? null,
          personalizationProfile: profile!,
          latencyMs: llmLatencyMs,
          history,
        });
      } else {
        // Whichever of Practice/Assessment/Concept Agent was attempted
        // and failed falls open into the same free-text path used when
        // none of them applied at all, rather than surfacing a raw error
        // to the student. At most one of these three is ever attempted
        // per turn, by construction above.
        if (practiceResult && !practiceResult.success) {
          await logEvent(supabase, {
            traceId,
            eventName: "practice_generation_failed",
            studentId,
            conversationId: activeConversationId,
            payload: { reason: practiceResult.reason, latencyMs: llmLatencyMs },
          });
        }
        if (assessmentResult && !assessmentResult.success) {
          await logEvent(supabase, {
            traceId,
            eventName: "assessment_failed",
            studentId,
            conversationId: activeConversationId,
            payload: { reason: assessmentResult.reason, latencyMs: llmLatencyMs },
          });
        }
        if (conceptResult && !conceptResult.success) {
          await logEvent(supabase, {
            traceId,
            eventName: "concept_explanation_failed",
            studentId,
            conversationId: activeConversationId,
            payload: { reason: conceptResult.reason, latencyMs: llmLatencyMs },
          });
        }

        // The one genuinely streamable path (client.ts's doc comment) --
        // every chunk goes straight to the student as it arrives via
        // `events.chunk`, and `signal` (request.signal, forwarded from
        // POST) lets a client-side Cancel actually stop the upstream
        // Anthropic call, not just stop rendering it.
        const llmResult = await generateTeachingReplyStreaming(
          history,
          teachingGuidance,
          (delta) => events.chunk(delta),
          signal,
        );

        // Logged immediately, separate from the reply_sent/reply_failed events
        // below -- this is observability into the new external dependency
        // itself (did Claude answer, how long did it take), not into whether
        // the resulting text made it into the database.
        await logEvent(supabase, {
          traceId,
          eventName: llmResult.success ? "llm_call_succeeded" : "llm_call_failed",
          studentId,
          conversationId: activeConversationId,
          payload: llmResult.success
            ? {
                model: llmResult.model,
                inputTokens: llmResult.inputTokens,
                outputTokens: llmResult.outputTokens,
                estimatedCostUsd: estimateCostUsd(llmResult.inputTokens, llmResult.outputTokens),
                latencyMs: Date.now() - llmStartedAt,
              }
            : { reason: llmResult.reason, latencyMs: Date.now() - llmStartedAt },
        });

        if (llmResult.success) {
          replyContent = llmResult.content;
        } else {
          // Honest, saved fallback -- mirrors the same principle M0-06 already
          // applies to the placeholder reply and M0-08 applies to safety
          // declines: even a bad outcome gets a real, persisted turn in the
          // conversation, never a raw crash or a silently missing reply.
          replyContent = buildLLMFailureReply();
          llmMetadata = { isFallbackReply: true };
        }
      }
    }
  }

  return {
    replyContent,
    replyKind,
    llmMetadata,
    safe: safetyAssessment.safe,
    practiceSetPayload,
    assessmentReportPayload,
    masteryUpdatePayload,
  };
}

/**
 * Evaluation Agent (M9): runs after Concept, Practice, or Assessment
 * Agent each succeed -- broader trigger coverage than M8's Reflection
 * (which only hooks Assessment), matching 13_Evaluation_Agent.md's own
 * Events Consumed and its "100% of learner interactions" coverage
 * target. Internal only -- never changes replyContent, which is already
 * decided by the caller before this runs. Wrapped in its own try/catch,
 * separate from any Reflection/Memory try/catch on the same turn, so an
 * Evaluation failure never affects them or the reply -- per
 * 13_Evaluation_Agent.md's own Retry Strategy: "Evaluation should never
 * block learner interactions."
 */
async function runEvaluationAgent(
  supabase: SupabaseServerClient,
  params: {
    traceId: string;
    studentId: string;
    conversationId: string;
    sourceAgent: EvaluationSourceAgent;
    responseText: string;
    concept: Concept | null;
    personalizationProfile: PersonalizationProfile;
    latencyMs: number;
    history: ClaudeMessage[];
  },
): Promise<void> {
  try {
    const evaluationContext: EvaluationAgentContext = {
      sourceAgent: params.sourceAgent,
      responseText: params.responseText,
      concept: params.concept,
      personalizationProfile: params.personalizationProfile,
      latencyMs: params.latencyMs,
      history: params.history,
    };
    const evaluationStartedAt = Date.now();
    const evaluationResult = await evaluateInteraction(evaluationContext, generateEvaluation);
    const evaluationLatencyMs = Date.now() - evaluationStartedAt;

    if (!evaluationResult.success) {
      await logEvent(supabase, {
        traceId: params.traceId,
        eventName: "evaluation_failed",
        studentId: params.studentId,
        conversationId: params.conversationId,
        payload: {
          sourceAgent: params.sourceAgent,
          reason: evaluationResult.reason,
          evaluationLatencyMs,
        },
      });
      return;
    }

    const { response } = evaluationResult;

    await logEvent(supabase, {
      traceId: params.traceId,
      eventName: "evaluation_completed",
      studentId: params.studentId,
      conversationId: params.conversationId,
      payload: {
        sourceAgent: params.sourceAgent,
        model: evaluationResult.model,
        overallScore: response.overallScore,
        qualityStatus: response.qualityStatus,
        groundedness: response.groundedness,
        accuracy: response.accuracy,
        educationalQuality: response.educationalQuality,
        personalization: response.personalization,
        clarity: response.clarity,
        safety: response.safety,
        hallucinationRisk: response.hallucinationRisk,
        // Evaluation's OWN call metadata -- distinct from `params.latencyMs`
        // above, which is the *source* agent's (Concept/Practice/
        // Assessment) latency that Evaluation's efficiency score is
        // computed from, not Evaluation's own cost to run.
        evaluationInputTokens: evaluationResult.inputTokens,
        evaluationOutputTokens: evaluationResult.outputTokens,
        evaluationCostUsd: estimateCostUsd(evaluationResult.inputTokens, evaluationResult.outputTokens),
        evaluationLatencyMs,
      },
    });

    if (response.qualityStatus === "NeedsImprovement") {
      await logEvent(supabase, {
        traceId: params.traceId,
        eventName: "low_quality_detected",
        studentId: params.studentId,
        conversationId: params.conversationId,
        payload: { sourceAgent: params.sourceAgent, overallScore: response.overallScore },
      });
    }

    if (response.hallucinationRisk === "High") {
      await logEvent(supabase, {
        traceId: params.traceId,
        eventName: "hallucination_detected",
        studentId: params.studentId,
        conversationId: params.conversationId,
        payload: { sourceAgent: params.sourceAgent, groundedness: response.groundedness },
      });
    }
  } catch (err) {
    await logEvent(supabase, {
      traceId: params.traceId,
      eventName: "evaluation_failed",
      studentId: params.studentId,
      conversationId: params.conversationId,
      payload: {
        sourceAgent: params.sourceAgent,
        reason: err instanceof Error ? err.message : "unknown_error",
      },
    });
  }
}
