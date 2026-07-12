import { createClient } from "@/lib/supabase/server";
import { generateTraceId, logEvent } from "@/lib/observability/trace";
import { checkMessageSafety, buildSafetyDeclineMessage } from "@/lib/safety/filter";
import { buildConversationContext, type ClaudeMessage } from "@/lib/agents/context-agent";
import {
  generateTeachingReply,
  classifyIntentWithClaude,
  classifySafetyWithClaude,
  generateConceptExplanation,
  generatePracticeSet,
  generateAssessment,
  generateReflection,
  generateEvaluation,
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
} from "@/lib/agents/practice-agent";
import {
  evaluateResponse,
  formatAssessmentReportAsReply,
  extractPracticeContext,
  type AssessmentAgentContext,
} from "@/lib/agents/assessment-agent";
import { reflectOnSession, type ReflectionAgentContext } from "@/lib/agents/reflection-agent";
import { updateLearnerProfile, type MemoryAgentContext } from "@/lib/agents/memory-agent";
import { createPostgresLearnerStateProvider } from "@/lib/learner/postgres-learner-state-provider";
import { createPostgresLearnerProfileWriter } from "@/lib/learner/postgres-learner-profile-writer";
import { createPostgresKnowledgeProvider } from "@/lib/knowledge/postgres-knowledge-provider";
import { createTrigramConceptSearchProvider } from "@/lib/knowledge/trigram-concept-search-provider";
import type { PlanningContext } from "@/lib/agents/planning-context";
import type { Concept } from "@/lib/knowledge/curriculum-types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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
  const content =
    typeof body?.content === "string" ? body.content.trim() : "";
  const conversationId =
    typeof body?.conversationId === "string" ? body.conversationId : null;

  if (!content) {
    return Response.json(
      { error: "Message content is required.", traceId },
      { status: 400 },
    );
  }

  // Layer 1 of M9's Safety Agent -- the M0 keyword filter, free and
  // deterministic. Computed here (before history even exists) so a
  // message it already flags never pays for a conversation lookup it
  // won't need history for; Layer 2 (below, after the message is saved)
  // only runs when this passes.
  const layer1Result = checkMessageSafety(content);

  let activeConversationId = conversationId;

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
      return Response.json(
        { error: "Could not start a new conversation.", traceId },
        { status: 500 },
      );
    }

    activeConversationId = conversation.id;
  }

  // The unsafe message is still saved -- it's part of the real
  // conversation history and needs to be reviewable (a parent or
  // reviewer must be able to see what was said and how MentorOS
  // responded), even though the reply it gets is a decline, not the
  // usual placeholder.
  const { data: userMessage, error: userMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: activeConversationId,
      role: "user",
      content,
    })
    .select("id, role, content")
    .single();

  if (userMessageError || !userMessage) {
    // Most likely cause: activeConversationId doesn't belong to this
    // student, and Row Level Security silently rejected the insert.
    await logEvent(supabase, {
      traceId,
      eventName: "message_rejected",
      studentId,
      conversationId: activeConversationId,
      payload: { reason: "user_message_save_failed" },
    });
    return Response.json(
      { error: "Could not save your message.", traceId },
      { status: 403 },
    );
  }

  // Built after the user message above was saved, so the history the
  // model sees naturally ends with the message the student just sent --
  // needed here (not just later) since Layer 2 of Safety Agent (M9)
  // reasons over the Context Object, per 03_Safety_Agent.md's Inputs
  // section. Skipped (and Layer 2 never called) when Layer 1 already
  // flagged the message -- evaluateSafety() short-circuits before ever
  // touching `history` or `classify` in that case.
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
  const safetyAssessment = await evaluateSafety(history, layer1Result, classifySafetyWithClaude);

  await logEvent(supabase, {
    traceId,
    eventName: safetyAssessment.safe ? "message_received" : "safety_blocked",
    studentId,
    conversationId: activeConversationId,
    payload: safetyAssessment.safe
      ? { contentLength: content.length }
      : {
          category: safetyAssessment.category,
          riskLevel: safetyAssessment.riskLevel,
          confidence: safetyAssessment.confidence,
          contentLength: content.length,
        },
  });

  let replyContent: string;
  let llmMetadata: Record<string, unknown> = {};

  if (!safetyAssessment.safe) {
    // Blocked messages never reach Router/Planning/Concept Agent at all
    // -- Safety Agent is the gate, not a pre-check the rest of the
    // pipeline could still be argued past. Zero further Anthropic API
    // calls for blocked content, by design.
    replyContent = buildSafetyDeclineMessage(safetyAssessment.category ?? "platform_abuse");
  } else {
    // Router Agent (M2): intent analysis only -- it never generates a
    // teaching reply itself. It decides whether this message needs
    // clarification; when it doesn't, the existing M1 reply path below
    // runs unchanged. A router failure fails open into that same M1 path
    // rather than blocking the message, since routing is an enhancement
    // layered on top of M1, not a new hard dependency of the chat route.
    const routerResult = await classifyIntent(history, classifyIntentWithClaude);

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
        },
      });
    } else {
      await logEvent(supabase, {
        traceId,
        eventName: "routing_failed",
        studentId,
        conversationId: activeConversationId,
        payload: { reason: routerResult.reason },
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
      // not teach. Every real learner currently reports isKnown: false (no
      // writer until M7/M8), so plan.strategy is "Diagnostic"
      // unconditionally in production today -- this branch is fully
      // tested but, like M4's High Mastery/Young Learner branches, not
      // yet exercised live. See M6's gate review.
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
            latencyMs: llmLatencyMs,
          },
        });

        replyContent = formatPracticeSetAsReply(practiceResult.response);

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
            latencyMs: llmLatencyMs,
          },
        });

        replyContent = formatAssessmentReportAsReply(assessmentResult.response);

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
          const reflectionResult = await reflectOnSession(reflectionAgentContext, generateReflection);

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
              },
            });
          } else {
            await logEvent(supabase, {
              traceId,
              eventName: "reflection_failed",
              studentId,
              conversationId: activeConversationId,
              payload: { reason: reflectionResult.reason },
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

          if (memoryResult.applied) {
            await logEvent(supabase, {
              traceId,
              eventName: "learner_profile_updated",
              studentId,
              conversationId: activeConversationId,
              payload: {
                conceptId: memoryResult.evidence?.conceptId,
                masteryScore: memoryResult.evidence?.masteryScore,
              },
            });
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

        const llmResult = await generateTeachingReply(history, teachingGuidance);

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

  const { data: assistantMessage, error: assistantMessageError } =
    await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: replyContent,
      })
      .select("id, role, content")
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
    return Response.json(
      { error: "Could not save the reply.", traceId },
      { status: 500 },
    );
  }

  await logEvent(supabase, {
    traceId,
    eventName: safetyAssessment.safe ? "reply_sent" : "safety_reply_sent",
    studentId,
    conversationId: activeConversationId,
    payload: {
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      ...llmMetadata,
    },
  });

  return Response.json({
    conversationId: activeConversationId,
    userMessage,
    assistantMessage,
    traceId,
  });
}

// Shown when the Claude API call itself fails (rate limit, timeout,
// outage) -- an honest, persisted turn rather than a raw crash or a
// silently missing reply. See Task 5 notes in
// docs/implementation/M1-04-Chat-Route-Integration.md.
function buildLLMFailureReply(): string {
  return "I'm having trouble responding right now. Please try sending your message again in a moment.";
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
    const evaluationResult = await evaluateInteraction(evaluationContext, generateEvaluation);

    if (!evaluationResult.success) {
      await logEvent(supabase, {
        traceId: params.traceId,
        eventName: "evaluation_failed",
        studentId: params.studentId,
        conversationId: params.conversationId,
        payload: { sourceAgent: params.sourceAgent, reason: evaluationResult.reason },
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
        safety: response.safety,
        hallucinationRisk: response.hallucinationRisk,
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
