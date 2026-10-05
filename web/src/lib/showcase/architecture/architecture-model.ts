/**
 * The MentorOS architecture as it is implemented, for the showcase map.
 * Every claim here is checked by tests/showcase/architecture-model.test.ts:
 * each event name must be written by the code, each decision source must exist,
 * and no secret-like string may appear. Nothing here is generated from prompts,
 * model output, or chain-of-thought.
 */

export type NodeStatus = "implemented" | "conditional" | "external_provider" | "deferred";
export type Lane = "core" | "voice";

export type ArchitectureNode = {
  id: string;
  title: string;
  lane: Lane;
  status: NodeStatus;
  /** Set when the node calls an external provider. */
  provider?: string;
  /** Durations recorded in events for this node. */
  measured: boolean;
  /** Data this node writes to durable storage. */
  persisted?: string;
  /** Conditional-stage description: when the node runs. */
  when?: string;
  responsibility: string;
  input: string;
  output: string;
  dependencies: string[];
  failure: string;
  /** Observability this node contributes, in plain words. */
  observability: string;
  /** Event names this node writes, verified against the code by tests. */
  events: string[];
  decisionId?: string;
};

export type ArchitectureDecision = {
  id: string;
  decision: string;
  why: string;
  tradeOff: string;
  /** Repository files that record the rationale. Verified to exist by tests. */
  sources: string[];
  /** `verified` = the rationale is written down. `open` = the structure is verified, the rationale is not. */
  rationale: "verified" | "open";
};

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: "student-turn",
    title: "Student turn",
    lane: "core",
    status: "implemented",
    measured: false,
    responsibility: "Receives one student message and saves it before any agent runs.",
    input: "Typed text, or a voice transcript sent as a normal text turn.",
    output: "A saved user message and a trace ID for the turn.",
    dependencies: ["Supabase (messages, conversations)"],
    failure: "A save failure stops the turn before any agent runs.",
    observability: "The turn's trace ID is the root for every later event. Save time is not measured separately.",
    events: [],
  },
  {
    id: "safety",
    title: "Safety",
    lane: "core",
    status: "implemented",
    provider: "Anthropic Claude (second layer)",
    measured: true,
    responsibility: "Blocks unsafe messages before routing or teaching. A deterministic keyword layer runs first, then a model classifier.",
    input: "The student message and the conversation history.",
    output: "Allow or block, with a category and a confidence level.",
    dependencies: ["Keyword filter (in code)", "Anthropic Claude"],
    failure: "Fails closed. If the model call fails, the message is blocked, not allowed through.",
    observability: "Latency and category on message_received or safety_blocked.",
    events: ["message_received", "safety_blocked", "safety_reply_sent"],
    decisionId: "safety-first",
  },
  {
    id: "context",
    title: "Context",
    lane: "core",
    status: "implemented",
    measured: false,
    responsibility: "Builds the conversation history the models see: a fixed recent window.",
    input: "The conversation's stored messages.",
    output: "The most recent 20 messages, in the form the models expect.",
    dependencies: ["Supabase (messages)"],
    failure: "Not separately recorded. A failure here ends the turn as errored.",
    observability: "Not instrumented on its own. The turn's overall outcome records any failure.",
    events: [],
  },
  {
    id: "router",
    title: "Router",
    lane: "core",
    status: "implemented",
    provider: "Anthropic Claude",
    measured: true,
    responsibility: "Classifies the intent (for example explain, practise, assess) and extracts the topic and subtopic.",
    input: "The message and the context window.",
    output: "Intent, topic, subtopic, and whether the question needs clarification first.",
    dependencies: ["Anthropic Claude"],
    failure: "Routing failure sends the turn to an unguided general reply.",
    observability: "Latency, intent, confidence, topic on intent_detected. Failure reason on routing_failed.",
    events: ["intent_detected", "routing_failed"],
  },
  {
    id: "planning",
    title: "Planning",
    lane: "core",
    status: "implemented",
    measured: true,
    responsibility: "Decides how to teach this turn: strategy, difficulty, and pace. Resolves the concept from the topic and reads the learner's state.",
    input: "The routed intent, the learner's stored state, and the curriculum.",
    output: "A learning plan and the resolved concept (or none).",
    dependencies: ["Supabase (learner state, curriculum)", "Postgres trigram matching"],
    failure: "Fails open. The turn continues as an unguided reply, and the failure is recorded.",
    observability: "Duration, strategy, and the concept ID on learning_plan_created. Failure on planning_failed.",
    events: ["learning_plan_created", "planning_failed"],
    decisionId: "planning-fails-open",
  },
  {
    id: "knowledge",
    title: "Knowledge retrieval",
    lane: "core",
    status: "implemented",
    measured: false,
    responsibility: "Fetches the matched concept's learning objectives, misconceptions, and teaching strategies. Runs inside Planning.",
    input: "The resolved concept ID.",
    output: "Objectives, misconceptions, and strategies for the teaching agent.",
    dependencies: ["Supabase (curriculum)", "pg_trgm concept matching"],
    failure: "Failures surface through Planning, which fails open.",
    observability: "Whether a concept was resolved is recorded. The retrieved items are not stored, and their timing is not measured.",
    events: [],
    decisionId: "trigram-before-embeddings",
  },
  {
    id: "teaching",
    title: "Teaching: Concept, Practice, or Assessment",
    lane: "core",
    status: "conditional",
    provider: "Anthropic Claude",
    measured: true,
    when: "Runs for every turn that is not blocked or clarified. The agent depends on the intent.",
    responsibility: "Produces the teaching content: an explanation, a practice set, or an assessment. Each has its own structured output.",
    input: "The plan, the knowledge, the conversation history, and the student's message.",
    output: "A structured teaching response, which becomes the reply text.",
    dependencies: ["Anthropic Claude"],
    failure: "Failure ends in the general fallback reply, which is recorded as a fallback.",
    observability: "Latency, model, tokens, and estimated cost per call on the teaching event. Failure reasons on the matching *_failed event.",
    events: ["concept_explained", "practice_generated", "assessment_completed", "llm_call_succeeded", "llm_call_failed"],
  },
  {
    id: "reflection",
    title: "Reflection",
    lane: "core",
    status: "conditional",
    provider: "Anthropic Claude",
    measured: true,
    when: "Assessment turns only. Awaited before the reply is returned.",
    responsibility: "Reviews the assessment report and session history to produce a reflection on the student's learning.",
    input: "The assessment report, the session history, and the learner profile (read-only).",
    output: "A reflection report, used as evidence for the learner-state update.",
    dependencies: ["Anthropic Claude"],
    failure: "Logged, and the turn continues without the reflection.",
    observability: "Latency, model, tokens, and cost on reflection_completed. Failure reason on reflection_failed.",
    events: ["reflection_completed", "reflection_failed"],
  },
  {
    id: "memory",
    title: "Memory and learner state",
    lane: "core",
    status: "conditional",
    measured: false,
    persisted: "Per-concept mastery and recorded misconceptions in learner_concept_mastery.",
    when: "Assessment turns only. Awaited before the reply is returned.",
    responsibility: "Records learning evidence against the concept it is about. Its output is a stored state update, not a reply.",
    input: "The assessment and reflection reports, and the resolved concept.",
    output: "Updated per-concept learner state. Nothing is persisted when no concept resolved.",
    dependencies: ["Supabase (learner_concept_mastery)"],
    failure: "Logged, and the turn continues. The learner state is not updated for that turn.",
    observability: "Not timed. The update and any failure are recorded as events.",
    events: ["learner_profile_updated", "memory_update_failed"],
  },
  {
    id: "evaluation",
    title: "Evaluation",
    lane: "core",
    status: "implemented",
    provider: "Anthropic Claude (as judge)",
    measured: true,
    when: "Runs on teaching turns and is awaited before the reply is returned.",
    responsibility: "Scores the reply on groundedness, accuracy, and safety. These are model-based judgements, not ground truth.",
    input: "The reply text and the source concept.",
    output: "Scores, a quality status, and a hallucination risk level.",
    dependencies: ["Anthropic Claude"],
    failure: "Logged, and the reply is still returned. The turn has no evaluation score.",
    observability: "Latency, tokens, cost, and scores on evaluation_completed. Quality and hallucination flags on their own events.",
    events: ["evaluation_completed", "evaluation_failed", "low_quality_detected", "hallucination_detected"],
    decisionId: "evaluation-separate-agent",
  },
  {
    id: "reply",
    title: "Reply and terminal outcome",
    lane: "core",
    status: "implemented",
    measured: true,
    persisted: "The assistant message, with its trace ID.",
    responsibility: "Saves the reply and records how the turn ended.",
    input: "The reply text from the pipeline.",
    output: "The stored assistant message and a terminal outcome event.",
    dependencies: ["Supabase (messages, RPC insert_assistant_message)"],
    failure: "A save failure is recorded as errored. A student cancel is recorded as cancelled, not as an error.",
    observability: "Wall-clock turn time and outcome on the terminal event: reply_sent, safety_reply_sent, reply_failed, or turn_cancelled.",
    events: ["reply_sent", "safety_reply_sent", "reply_failed", "turn_cancelled"],
  },
  {
    id: "event-log",
    title: "Event log",
    lane: "core",
    status: "implemented",
    measured: false,
    persisted: "Every stage event for every turn, with its trace ID.",
    responsibility: "Stores the audit trail the Flight Recorder reads. Events are the only observability store.",
    input: "Events from each stage, written by the server.",
    output: "Rows read by the Flight Recorder through the student's own session.",
    dependencies: ["Supabase (events, row-level security)", "Sentry (for failed writes)"],
    failure: "A failed write never stops the turn. It is reported to Sentry.",
    observability: "This is the observability store itself.",
    events: [],
    decisionId: "events-as-audit-log",
  },
  {
    id: "mic",
    title: "Microphone",
    lane: "voice",
    status: "implemented",
    measured: false,
    responsibility: "Records a push-to-talk clip in the browser.",
    input: "The student's voice.",
    output: "A WAV clip, converted to 16 kHz mono in the browser.",
    dependencies: ["Browser audio capture"],
    failure: "Permission handling is not verified in this map.",
    observability: "A recording-start event. Audio is not stored.",
    events: ["voice_recording_started"],
  },
  {
    id: "stt",
    title: "Speech-to-text",
    lane: "voice",
    status: "external_provider",
    provider: "Meta Muse",
    measured: true,
    responsibility: "Turns the recorded clip into a transcript.",
    input: "The WAV clip.",
    output: "A transcript, sent on as a normal text turn.",
    dependencies: ["Meta Muse"],
    failure: "The student is told the voice input is unavailable and can type instead.",
    observability: "Latency, audio length, and transcript length. The audio and the transcript text are not stored by this event.",
    events: ["voice_transcription_completed", "voice_transcription_failed"],
  },
  {
    id: "student-turn-voice",
    title: "Voice turn",
    lane: "voice",
    status: "implemented",
    measured: false,
    responsibility: "Sends the transcript through the same pipeline as typed text, tagged with the voice trace ID.",
    input: "The transcript and the voice trace ID.",
    output: "A normal student turn, with the voice trace ID on its reply event.",
    dependencies: ["The core pipeline above"],
    failure: "Follows the core pipeline's failure behaviour.",
    observability: "The voice trace ID is recorded on the reply event, which links the voice turn to its chat trace.",
    events: ["reply_sent"],
    decisionId: "one-pipeline",
  },
  {
    id: "speech",
    title: "Speech normalisation",
    lane: "voice",
    status: "implemented",
    measured: false,
    responsibility: "Prepares the reply for speech: fractions and symbols are spoken as words, and the text is split into sentences that are sent as they become ready.",
    input: "The streamed reply text.",
    output: "Sentences, sent to the avatar one at a time.",
    dependencies: ["Browser"],
    failure: "If the avatar is not connected, the text reply still shows.",
    observability: "Timing is recorded on voice_turn_timing from the browser.",
    events: ["voice_turn_timing"],
  },
  {
    id: "avatar",
    title: "Tavus Echo / Dr. Paws",
    lane: "voice",
    status: "external_provider",
    provider: "Tavus",
    measured: true,
    responsibility: "Speaks the reply through the Dr. Paws avatar. The avatar runs no model of its own: it receives text and renders speech.",
    input: "Sentences of reply text, sent as echo messages.",
    output: "Spoken audio and video in the browser.",
    dependencies: ["Tavus", "Daily (browser connection)"],
    failure: "If the session cannot be created, joined, or spoken, the text reply still shows and the failure is recorded.",
    observability: "Session start and speaking events carry the voice trace ID and the Tavus conversation ID. Live end-to-end verification is pending.",
    events: ["avatar_session_started", "avatar_failed", "avatar_speaking_started"],
    decisionId: "avatar-as-renderer",
  },
];

export const ARCHITECTURE_DECISIONS: ArchitectureDecision[] = [
  {
    id: "safety-first",
    decision: "Safety runs before routing and teaching.",
    why: "ADR 003 records Safety as the first stage. Safety's own code comment says it is the gate, not an enhancement: uncertainty resolves toward blocking.",
    tradeOff: "Adds the Safety call's latency to every turn. Measured in production traces at about 1.8 seconds.",
    sources: ["docs/adr/003-multi-agent-pipeline.md", "web/src/lib/agents/safety-agent.ts"],
    rationale: "verified",
  },
  {
    id: "planning-fails-open",
    decision: "Planning fails open. Safety fails closed.",
    why: "Planning is an enhancement, so a Planning failure produces an unguided reply rather than no reply. Safety is the gate, so its failure blocks.",
    tradeOff: "An unguided reply is less targeted. A Safety outage blocks messages, including harmless ones.",
    sources: ["web/src/app/api/chat/route.ts", "web/src/lib/agents/safety-agent.ts"],
    rationale: "verified",
  },
  {
    id: "separate-agents",
    decision: "Each stage is a separate agent with its own logged output.",
    why: "ADR 003: transparency and independent testability, so each decision can be inspected and tested on its own.",
    tradeOff: "More model calls per turn. ADR 003 records this as a deliberate cost.",
    sources: ["docs/adr/003-multi-agent-pipeline.md"],
    rationale: "verified",
  },
  {
    id: "evaluation-separate-agent",
    decision: "Evaluation is a separate agent that scores each reply.",
    why: "ADR 003 lists Evaluation as its own pipeline stage. No written rationale for the reply waiting on it is recorded in the repository.",
    tradeOff: "On teaching turns the student waits for it: about 2 seconds in measured traces. The judge's scores are model judgements, not ground truth.",
    sources: ["docs/adr/003-multi-agent-pipeline.md", "web/src/app/api/chat/route.ts"],
    rationale: "open",
  },
  {
    id: "trigram-before-embeddings",
    decision: "Concept matching uses pg_trgm, not embeddings.",
    why: "The decision is recorded as explicit: pg_trgm is already in Postgres, adds no vendor, and the current one-chapter curriculum does not yet need more.",
    tradeOff: "Natural phrasing can miss. The golden set's comments record a real case where a synonym failed to resolve a concept.",
    sources: ["docs/implementation/M5-02-Retrieval-Intelligence.md", "web/src/lib/evaluation-lab/golden-eval-set.ts"],
    rationale: "verified",
  },
  {
    id: "relational-curriculum",
    decision: "The curriculum is a relational graph: concepts linked by typed edges.",
    why: "The schema records relationship kinds as rows, so new kinds can be added without a schema change.",
    tradeOff: "Edges need curation. Unpublished draft content is excluded from learner-facing views.",
    sources: ["web/supabase/migrations/0002_curriculum_foundation.sql", "web/supabase/migrations/0027_seed_ncert_cbse_class4_math_fractions.sql"],
    rationale: "verified",
  },
  {
    id: "one-pipeline",
    decision: "Typed and spoken turns use one tutoring pipeline.",
    why: "The route treats modality as metadata only, so a voice turn takes the identical path.",
    tradeOff: "Voice inherits the text pipeline's latency: about 15 seconds from transcript to reply in one measured voice turn.",
    sources: ["web/src/app/api/chat/route.ts"],
    rationale: "verified",
  },
  {
    id: "avatar-as-renderer",
    decision: "The avatar is a presentation layer, not a tutoring brain.",
    why: "The voice hook is written as a renderer: MentorOS produces the text, and the avatar speaks it.",
    tradeOff: "Avatar timing is observed in the browser, not reported by Tavus. End-to-end live verification is pending.",
    sources: ["web/src/components/voice/useAvatarSession.ts"],
    rationale: "verified",
  },
  {
    id: "events-as-audit-log",
    decision: "The events table substitutes for a message broker. Every stage writes one row, and readers query the table.",
    why: "ADR 002: each stage writes directly to the events table within the same request. Observability and the Flight Recorder are queries over the same rows, not separate subscribers.",
    tradeOff: "No independent retries or parallel consumers. ADR 002 names these as the conditions for reconsidering a real broker. Payloads are JSON, and failed writes are reported, not retried.",
    sources: ["docs/adr/002-events-table-message-broker.md", "web/src/lib/observability/trace.ts"],
    rationale: "verified",
  },
];

/** Claims this map deliberately does not make. Shown on the page, not hidden. */
export const CLAIMS_NOT_MADE: string[] = [
  "No positioned waterfall. Stage start times are not stored, so stages are not placed on a timeline.",
  "Knowledge retrieval has no duration of its own, and the retrieved items are not stored.",
  "Context has no duration of its own.",
  "Time to first streamed token is not measured.",
  "The avatar's end-to-end path is implemented and unit-tested. Live end-to-end verification is pending.",
  "Muse and Tavus costs are not captured. Model cost is an estimate from token counts, not a bill.",
  "Personalization is not shown as a node. It is a stub, and it does not change teaching yet.",
  "Pipeline cancellation is observed, not enforced. Browser cancel does not reliably stop in-flight model work.",
  "Microphone-permission handling and client-side retries are not verified.",
  "No chain-of-thought, prompts, or model reasoning are shown anywhere on this page.",
];
