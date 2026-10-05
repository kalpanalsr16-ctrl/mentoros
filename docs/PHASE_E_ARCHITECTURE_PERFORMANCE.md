# Phase E — Architecture, Performance and AI Economics (Audit and Proposal)

Status: **audit and design proposal. No code, schema, prompt, Router, judge, threshold, or benchmark changes.**
Scope: what the MentorOS system does today, what it measures, and what the showcase can honestly show.
Every claim below cites the code path or the database count it came from. Where something could not be confirmed, it is marked **unverified**.

Sample counts come from the `events` table on the production database, counted across all accounts. They therefore include the demo account, automated tests, and the golden benchmark runs. They are not a population of real students.

---

## 1. Current architecture

A text turn enters `POST /api/chat` and runs `runTutoringPipeline` (`web/src/app/api/chat/route.ts`). The stages run in this order:

1. **Safety** (LLM). Fail-closed: a model error produces a decline, not a pass.
2. **Router** (LLM). Produces intent, topic, subtopic, and a `needsClarification` flag.
3. **Planning** (deterministic, with DB reads). Reads learner state, resolves a concept by trigram search, reads knowledge (objectives, misconceptions, strategies), and decides the plan. Fails open to an unguided reply.
4. **Personalization** (deterministic). Stub until learner profiles are richer.
5. **Teaching agent** (LLM), chosen by intent: Concept, Practice, or Assessment.
6. **Reflection** (LLM, Assessment turns only). Awaited.
7. **Memory / learner state** (DB write, Assessment turns). Awaited.
8. **Evaluation** (LLM). Awaited on the Concept, Practice, and Assessment paths, before the reply is returned.
9. **Reply** is persisted and returned. `reply_sent` is logged after the pipeline returns.

The voice path wraps this pipeline:

- Browser records a push-to-talk clip, then `POST /api/voice/transcribe` calls Meta Muse and returns a transcript and a `traceId` (`web/src/app/api/voice/transcribe/route.ts`, `web/src/lib/voice/muse-transcribe.ts`).
- The browser sends the transcript to `/api/chat` as a normal text turn, carrying `voiceTraceId`.
- The reply streams back. Speech is normalised (`web/src/lib/avatar/speech-text.ts`), split into sentences (`speech-sentences.ts`), and sent to Tavus Echo as `conversation.echo` (`web/src/components/voice/useAvatarSession.ts`).
- Dr. Paws speaks. Browser events (`avatar_speaking_started`, `voice_turn_timing`) are posted to `/api/voice/events`.

### Is the simplified diagram accurate?

Mostly, with four corrections:

- **Evaluation is on the student's critical path.** The simplified diagram implies it runs alongside the reply. On all three teaching paths (Practice, Assessment, Concept) it is awaited before the reply is returned (`route.ts` lines 758, 801, 926).
- **Reflection and Memory are on the critical path for Assessment turns.** They are awaited (`route.ts` lines 828–870).
- **Planning is not one stage.** It is learner-state read → trigram concept search → knowledge reads (three queries in parallel) → plan decision. Retrieval is inside Planning, not a separate node. Nothing times it separately.
- **Personalization is a stub today.** It produces a fixed profile until learner profiles are richer (`personalization-agent.ts` comment).

---

## 2. Execution graph (text turn)

```
request
 │
 ├─ rate limit check ─────────────────────────── (sequential, unmeasured)
 ├─ save user message ────────────────────────── (sequential, unmeasured)
 │
 ├─ SAFETY (LLM, measured: message_received.latencyMs)
 │     └─ safety_blocked → decline reply, end
 │
 ├─ ROUTER (LLM, measured: intent_detected.latencyMs)
 │     ├─ routing_failed → unguided general reply path (LLM)
 │     └─ needsClarification → clarification reply, end
 │
 ├─ PLANNING (unmeasured, DB-bound, fails open)
 │     ├─ learner state read          ─┐
 │     ├─ trigram concept search       │ sequential
 │     ├─ concept read                 │
 │     └─ objectives ∥ misconceptions ∥ strategies   (Promise.all)
 │     └─ planning_failed → unguided general reply path
 │
 ├─ TEACHING (LLM, measured: llmLatencyMs on the teaching event)
 │     ├─ Concept | Practice | Assessment
 │     ├─ Assessment → REFLECTION (LLM, awaited, measured)
 │     └─ Assessment → MEMORY (DB write, awaited, unmeasured)
 │
 ├─ EVALUATION (LLM, awaited, measured: evaluation_completed.evaluationLatencyMs)
 │     └─ evaluation_failed → logged, reply still returned
 │
 └─ save assistant message, log reply_sent, return   (unmeasured)
```

Conditional stages: clarification, practice, assessment, reflection, memory, and the general reply path.
Parallel stages: only the three knowledge reads inside Planning (`planning-agent.ts` line 54).

---

## 3. Existing observability inventory

Legend: **P** = persisted in the `events` table. **L** = log only. **—** = not captured.

| Item | Captured | Where | Notes |
|---|---|---|---|
| Trace ID (text turn) | P | `events.trace_id`, `messages.trace_id` (0007) | One per request |
| Turn ID | — | — | No separate turn ID. The trace ID serves as one. `conversation_id` groups turns |
| Voice trace ID | P | `voice_transcription_*` events use it as `trace_id`. `reply_sent.payload.voiceTraceId`, `voice_turn_timing.payload.voiceTraceId` | Chat trace and voice trace are joinable (see §4) |
| Agent name | P | `event_name` | Safety, Router, Planning, Teaching, Reflection, Memory, Evaluation |
| Start / end | — | — | Only durations are stored, not start or end timestamps. The row `created_at` is when the event was written, not when the stage began |
| Duration | P | `latencyMs` on Safety, Router, Teaching, Reflection, `evaluationLatencyMs` | **Not on Planning, Personalization, Memory, reply save** |
| Model | P | `payload.model` on LLM stages | Safety, Router, Teaching, Reflection, Evaluation. Voice STT has no model field |
| Input tokens | P | `inputTokens` / `evaluationInputTokens` | Provider `usage` values |
| Output tokens | P | `outputTokens` / `evaluationOutputTokens` | Same |
| Total tokens | derived | `recent-traces-aggregation`, `transparency-provider` | Sum, computed at read time, not stored |
| Estimated cost | P | `estimatedCostUsd` / `evaluationCostUsd` | Computed by `estimateCostUsd` from fixed constants (`llm/client.ts`, $5 / $25 per 1M tokens) |
| Routing | P | `intent_detected`: primaryIntent, confidence, topic, subtopic | |
| Planning | P | `learning_plan_created`: strategy, difficulty, pace, `conceptId`, `conceptName`, `conceptResolved` | `conceptId` is new (Phase B). Older traces lack it |
| Retrieval | partial | `conceptResolved` on the plan event | Which curriculum nodes were retrieved is **not stored**. Concept search latency is **not stored** |
| Evaluation | P | `evaluation_completed`: overall, groundedness, accuracy, safety, quality status, hallucination risk, tokens, cost, latency | LLM-as-judge output |
| Learner-state updates | P | `learner_profile_updated`, `memory_update_failed`, `reflection_completed` | Mastery values are in `learner_concept_mastery`, not per event |
| Errors | P | `*_failed`, `llm_call_failed`, `reply_failed`, `voice_transcription_failed` | With `reason` |
| Fallbacks | P | `planning_failed`, `routing_failed` (both lead to the unguided path) | No explicit "fallback used" event. It is inferred from which events exist |
| Voice transcription | P | `voice_transcription_completed`: audioSeconds, transcriptLength, latencyMs | Muse latency is the measured fetch time |
| Muse cost | — | — | Not captured. Muse billing model unknown to this codebase |
| Tavus session lifecycle | P | `avatar_session_started`, `avatar_failed` (stage create/join/speak) | Own trace ID. **No voice trace ID** |
| Tavus `started_speaking` | P | `avatar_speaking_started` | Browser-observed. No latency in payload |
| Question end → transcript | P | `voice_turn_timing.questionEndToTranscriptMs` | Browser clock |
| Transcript → reply | P | `voice_turn_timing.transcriptToReplyMs` | Browser clock |
| Reply → first avatar audio | P | `voice_turn_timing.replyStartToAvatarAudioMs` and `replyToAvatarAudioMs` | Browser clock |
| Total voice latency | P | `voice_turn_timing.totalMs` | Browser clock, question end to first audio |
| Cancelled turn | — | — | No event. Confirmed by a search for cancel-related logging in the pipeline |
| Console output | L | `logEvent` failure path only | `console.error`, not persisted. A failed log write is silent to the student |

---

## 4. Trace correlation map

| Link | Joinable? | How |
|---|---|---|
| Chat turn → its stage events | Yes | `events.trace_id` |
| Chat turn → assistant message | Yes | `messages.trace_id` |
| Chat turn → conversation | Yes | `events.conversation_id` |
| Voice transcription → chat turn | Yes | `reply_sent.payload.voiceTraceId` = transcription `trace_id` |
| Browser voice timing → chat turn | Yes | `voice_turn_timing.payload.voiceTraceId` |
| Benchmark run → its traces | Yes | `eval_run_items.trace_id` → `events.trace_id` |
| Avatar session → voice turn | **No** | `avatar_session_started` has its own trace and only the Tavus `conversationId`. No voice trace ID is recorded alongside it |
| Avatar session → conversation | Partial | `conversationId` is in the session event payload, but no conversation or message ID is linked to it |
| Cancelled turn → anything | **No** | Nothing is logged |
| Concept → turn | Yes, new traces only | `conceptId` on `learning_plan_created` and `concept_explained` (Phase B). Older traces: not instrumented |
| Learner-state write → turn | Partial | `learner_profile_updated` is in the turn's trace. Per-concept mastery in `learner_concept_mastery` has no event ID link |

**Where trace IDs are lost:** cancelled turns, the Tavus session (separate trace, no voice link), and any `logEvent` failure (silently dropped).

---

## 5. Performance metrics available today

Measured on the server (wall clock around each call, `Date.now()` in `route.ts`):

- Safety latency
- Router latency
- Teaching LLM latency (Concept, Practice, Assessment)
- Reflection latency
- Evaluation latency
- Muse transcription latency (fetch time)

Measured in the browser (`useAvatarSession.ts`, `MicButton.tsx`):

- Question end → transcript
- Transcript → reply
- Reply → first avatar audio
- Total voice time to first audio

**Not measured anywhere:**

- Total wall-clock turn latency. The trace `totalLatencyMs` is the **sum of measured stage latencies**, not elapsed time. It excludes Planning, Personalization, Memory, saves, network, and streaming overhead. The label "total" in the current UI is therefore a sum, and should be described as one.
- Planning latency, including learner-state and trigram search time.
- Knowledge read latency.
- Memory write latency.
- Time from request to first streamed token.
- Tavus internal latency (it is inferred only from browser events).

**Observed example, one Concept text turn (trace inspected during Phase B):** Safety 1.8 s, Router 2.0 s, Concept 10.8 s, Evaluation 2.0 s. Stage sum 16.7 s. These are single observations, not statistics.

**Observed example, one voice turn:** transcription 3.2 s, question end → transcript 3.5 s, transcript → reply 14.8 s, reply → avatar audio 1.5 s. Single observation.

---

## 6. Token and cost metrics available today

- **Input and output tokens** are provider-reported, per LLM call, persisted on the stage event.
- **Total tokens** are derived at read time.
- **Estimated cost** is computed in code from two constants ($5 and $25 per 1M tokens) for the single model `claude-opus-4-8`. It is an estimate, not an invoice figure. The same constants are duplicated in `observability-agent.ts`, so a price or model change needs both updated. There is a comment saying so, but no test enforces it.
- **Cost by agent** is available by grouping stage events. **Cost by model** is trivially one model today.
- **Not captured:** Muse cost, Tavus cost, Anthropic cache-read or batch pricing, and any cost for the embeddings path (none exists).
- **Trust level:** tokens are good. Cost is a consistent estimate from fixed pricing, suitable for comparing stages with each other, not for reconciling against a bill.

Cost per benchmark run is also derivable from the same events, because each run item links to its trace.

---

## 7. Sample-size limitations

Event counts (all accounts, production database):

| Event | Rows | Usable for |
|---|---|---|
| `message_received` (Safety) | 214 | Safety latency |
| `intent_detected` (Router) | 200 | Router latency |
| `concept_explained` | 60 | Concept latency |
| `practice_generated` | 19 | Practice latency. Too small for percentiles |
| `assessment_completed` | 61 | Assessment latency |
| `reflection_completed` | 25 | Reflection latency. Too small for percentiles |
| `evaluation_completed` | 111 | Evaluation latency |
| `reply_sent` | 173 | Turn count |
| `voice_transcription_completed` | 43 | Muse latency |
| `voice_turn_timing` | 33 | Voice timing |
| `avatar_session_started` | 37 | Tavus session count |
| `avatar_speaking_started` | 25 | Tavus speech count |
| `llm_call_failed` | 2 | Error rate: not usable |
| `evaluation_failed` | 1 | Error rate: not usable |
| `reply_failed` | 0 | Error rate: none observed |

**Responsible-statistics policy (proposed):**

- Show no percentile for any stage with fewer than 30 samples.
- Show p50 only at n ≥ 30.
- Show p90 only at n ≥ 50.
- Always print n next to the figure.
- Separate benchmark and test traffic from student traffic before computing anything. Right now the counts above mix them.
- Do not report a failure rate with fewer than about 100 turns. At 2 failed LLM calls, a rate is noise.

**Current state:** Concept, Evaluation, and Safety have enough samples for p50 and possibly p90. Voice timing (n = 33) supports p50 only. Reflection, Practice, and every failure event do not support any percentile.

Mixing traffic also means the p50 figures describe the test and benchmark workload as much as student use. That needs a filter before any figure is shown as student behaviour.

---

## 8. Critical path analysis

For a representative **Concept** text turn, the student's wait is:

| Stage | Type | Measured? | Observed |
|---|---|---|---|
| Rate limit, save user message | Sequential | No | — |
| Safety | Sequential, conditional on nothing | Yes | ~1.8 s |
| Router | Sequential | Yes | ~2.0 s |
| Planning: learner state, trigram search, concept read | Sequential | **No** | unknown |
| Planning: objectives ∥ misconceptions ∥ strategies | Parallel (3 reads) | **No** | unknown |
| Concept LLM | Sequential | Yes | ~10.8 s (dominant) |
| Evaluation LLM | **Sequential, awaited before the reply** | Yes | ~2.0 s |
| Save reply, log `reply_sent`, return | Sequential | No | — |

Observed stage sum: ~16.7 s. Of that, the Concept LLM is about 65%. Evaluation is about 12%, and it is on the student's wait.

**Conditional stages:** clarification (skips planning and teaching), Reflection and Memory (Assessment only), and the unguided fallback (when Router or Planning fails).

**Answer to "why does this turn take this long?":** On a Concept turn, the dominant cost is one large model call with a long answer. The second-largest is an evaluation call the student waits for. Safety and Router together add about 4 s before teaching begins. The unmeasured Planning stage is a gap in the answer, and it could be large enough to matter.

**Voice path:** transcription (~3 s) and transcript-to-reply (~15 s, which contains the whole text pipeline) dominate. The reply-to-first-audio step is short (~1.5 s).

**Dependency graph is proven for:** Safety → Router → Planning → Teaching → Evaluation → reply. Parallelisation candidates exist only in Planning's three reads. **Decoupling Evaluation from the reply is a candidate, not a proven change.** Whether a reply may be shown before its evaluation is a product and safety decision, because the evaluation's safety subscore caps the overall score.

---

## 9. Graceful-degradation matrix

Legend: **Implemented** = verified in code. **Desired** = not implemented.

| Failure | Behaviour | Status |
|---|---|---|
| Microphone permission denied | Voice input unavailable, typing still works | **Unverified** in `MicButton.tsx`. Not inspected in detail |
| Muse unavailable (timeout, upstream, not configured) | Route returns an error message, `voice_transcription_failed` logged. The student can type instead | **Implemented** (`voice/transcribe/route.ts`) |
| Anthropic unavailable (any LLM call) | `llm_call_failed`, then a generic failure reply (`buildLLMFailureReply`) | **Implemented** (`route.ts` around line 1022) |
| Safety model unavailable | Fail-closed: declines. Observed in production during a credit outage | **Implemented** (fail-closed), observed |
| Tavus unavailable at session create | `avatar_failed` stage `create`. Text reply still shown | **Implemented** |
| Tavus join fails | `avatar_failed` stage `join`, status `failed`, text reply still shown | **Implemented** (`useAvatarSession.ts`) |
| Tavus speech fails mid-turn | `avatar_failed` stage `speak`, turn reported failed | **Implemented** |
| Voice transcription fails | `voice_transcription_failed`, error message shown | **Implemented** |
| Learner state unavailable | Planning throws, `planning_failed`, unguided reply | **Implemented** (fails open) |
| Retrieval (concept search) fails | Same as Planning: `planning_failed`, unguided reply | **Implemented** (fails open) |
| Router fails | `routing_failed`, unguided general reply | **Implemented** |
| Evaluation fails | `evaluation_failed` logged. Reply still returned | **Implemented** (non-blocking). Score is absent for that turn |
| Reflection fails | `reflection_failed` logged, turn continues | **Implemented**, awaited but non-blocking to the reply |
| Memory write fails | `memory_update_failed` logged, turn continues | **Implemented** |
| Event logging fails | `console.error`, the student is not affected | **Implemented**. Silent loss of observability |
| Upstream request cancelled by the student | Turn is discarded, nothing saved, no event logged | **Implemented** (`cancelled` path). **No observability** |
| Browser disconnects mid-stream | Not inspected | **Unverified** |
| Distributed rate limiting | Per-instance, in memory. Not shared across instances | **Partial** (documented limitation) |
| Circuit breaker for a failing provider | Not present | **Desired / not built** |
| Retry with backoff on LLM calls | Not present in the inspected path | **Unverified**, likely not present |
| Timeout on LLM calls | Not inspected | **Unverified** |
| Cached last-known-good curriculum | Not present | **Desired / not built** |
| Degraded voice: text-only when Tavus is down | Implemented, text reply remains. Student sees Dr. Paws missing, not an error | **Implemented** |

---

## 10. Architecture decision inventory

Rationale is cited only from the repository's ADRs, implementation docs, or code comments. Where rationale is missing, it is flagged.

| Decision | Why (source) | Trade-off | Alternative | Reconsider when |
|---|---|---|---|---|
| Safety before Router (ADR 003 lists the order; the hard-gate reasoning is not stated there) | Fail-closed behaviour observed in production. Rationale to be confirmed | Adds ~1.8 s to every turn | Parallel safety with routing, then cancel | When safety latency is measured as a material share of the wait, and an async design is proven safe |
| Planning decides how, Concept teaches what (not stated in ADR 003; code structure in `planning-agent.ts`) | Separates strategy from content so each can be evaluated | Two calls' worth of coordination | Single teaching prompt | When plan quality cannot be evaluated separately |
| Memory records rather than teaches (not in ADR 003; `memory-agent.ts` structure) | Learner state writes are deterministic and auditable | None of the teaching is in memory | Memory-driven prompts | When memory needs to influence wording |
| Evaluation is a separate agent (ADR 003 lists it in the pipeline). Independence as a rationale is not documented | Judge does not share the teaching prompt | Adds an LLM call on the wait | Self-evaluation in the teaching call | When evaluation can be made asynchronous without changing its safety role |
| Relational curriculum (migration 0002, M5 docs) | Prerequisites and misconceptions are queryable | Requires seeding and curation | Flat text per concept | Scale beyond one chapter |
| pg_trgm concept resolution (M5-02 doc) | "Real improvement over exact-name matching, no new vendor." Matching logic runs in SQL | Fuzzy and naive. The golden set shows phrasing sensitivity | Embeddings | When natural-language phrasing causes measured misses at scale |
| Embeddings deferred (M5-02 doc) | "Explicitly deferred" in three docs. Current curriculum is one chapter | No semantic retrieval | Embedding index | When trigram misses are measured and felt |
| Typed and voice turns converge (voice spec and `route.ts` `modality`) | One pipeline, one set of safety and evaluation rules | Voice inherits text latency | Separate voice pipeline | Not expected to change |
| Avatar is presentation only (voice spec, `useAvatarSession.ts`) | Tavus receives text only. Tavus runs no LLM, STT, or memory | Avatar timing is browser-observed | Tavus as a conversational agent | Not expected to change |
| Semantic content persisted, not raw audio (voice spec) | Privacy and storage. Transcript and timing only | Cannot replay audio for debugging | Store audio | When an error class cannot be diagnosed without audio, with consent |
| Provider abstractions for STT, knowledge, learner state, avatar | Each provider can be replaced or faked in tests | Some indirection | Direct calls | Not expected to change |
| Custom observability, not Langfuse (ADR 008) | No new vendor, events table as broker (ADR 002) | Build and maintain our own dashboards | Hosted tracing | When cross-team tooling is needed |
| Events table as message broker (ADR 002) | Single durable log, RLS-scoped reads | Write amplification, JSON payloads | Message queue | Volume or consumer count grows |
| Server-side provider secrets | API keys read from env on the server. The repository secret scan found no key values. A client-bundle audit has not been done | None significant | Browser keys | Not expected to change |
| Degradation: fail open for planning, fail closed for safety | Planning is an enhancement. Safety is a gate | Unguided replies can be lower quality | Fail closed everywhere | When an unguided reply is measured as harmful |
| In-memory rate limits | Simple, no new infrastructure | Not shared across instances. Limits are per instance | Shared store (Redis or Postgres) | Multi-instance traffic is real |

**Citation caveat:** ADR 003 is cited by title only. Its body was not re-read in this audit, so the rationale it is cited for must be checked against it before the showcase quotes it.

**Flagged as unclear:** no ADR records the decision to put Evaluation on the student's critical path. The code comment describes evaluation as "never block learner interactions" (`trace.ts`), but the awaited evaluation call in the teaching path blocks the reply. This needs a decision, not an assumption.

---

## 11. Missing instrumentation

Ranked by how much each gap weakens the showcase:

1. **Total turn wall-clock.** Add a start and end timestamp for the request, and log total elapsed time as a stage in its own right.
2. **Planning latency.** Time the learner-state read, the trigram search, the knowledge reads, and the plan decision, separately.
3. **Memory and save latency.** Time the learner-profile write and the message save.
4. **Cancelled turns.** Log an event with the trace ID, the stage at which cancel occurred, and elapsed time.
5. **Avatar-to-turn link.** Include `voiceTraceId` in `avatar_session_started` and in each `avatar_speaking_started`.
6. **Stage start times.** Store start offsets, so a real waterfall can be drawn. Today only durations exist.
7. **Retrieved curriculum nodes.** Store the IDs of the concepts and objectives used. This is currently "Not currently instrumented".
8. **Fallback used.** An explicit event for each fail-open path, so fallbacks can be counted rather than inferred.
9. **Muse and Tavus cost.** Only if the providers bill in a way we can read. Otherwise show as not instrumented.
10. **Pricing single source.** Move the two pricing constants to one module, with a test that compares the two copies.
11. **Logging failures.** Count dropped events, so silent loss is visible.
12. **Benchmark and test traffic separation.** A flag or account class, so the student dashboard can exclude it.

---

## 12. Proposed Phase E UI

Within the existing `/showcase`, add two sections. Each shows only data the instrumentation above supports.

**SYSTEM ARCHITECTURE**

- An interactive map of the text pipeline (Safety → Router → Planning → Teaching → Evaluation → Memory → reply), plus the voice path (Mic → Muse → MentorOS → Tavus → Dr. Paws).
- Selecting a node shows: responsibility, inputs, outputs, dependencies, failure behaviour (from §9, with implemented vs desired labelled), and the design decision (from §10).
- Each node links to the most recent real trace that passed through it. Nodes with no trace show "No recent trace".
- The Planning node is shown as a single node with a note that its internal latency is not instrumented.

**PERFORMANCE**

- Text turn latency: the sum of measured stages, labelled "sum of measured stages", not "total".
- Voice time to first audio: browser-measured, with n.
- Token usage and estimated cost by stage, with n.
- Error and fallback counts, with n and denominator.
- Percentiles only where §7's policy allows. Otherwise a single median with n, or "insufficient samples".
- A filter that separates student traffic from benchmark and test traffic.

**TRACE WATERFALL** (per trace, from the trace detail)

- Stage bars using measured durations only. Stages with no duration are listed as not measured.
- No invented start offsets until §11 item 6 is built. Until then, bars are proportional to duration, not positioned on a timeline.
- Voice extension: question end, transcription, pipeline, first audio, each with its measured value.

**AI ECONOMICS**

- Model, tokens, and estimated cost per stage.
- Cost distribution across the turns with enough samples to show one.
- Framed as one constraint among quality, latency, cost, and safety. Not as the product goal.

---

## 13. Proposed implementation phases

Each phase is proposed for approval separately.

- **E1 — Instrumentation gaps that block honest claims.** Items 1, 2, 4, 5 from §11. Requires a small, reviewed change to `route.ts`, `avatar/session/route.ts`, and the voice events route. No behaviour change. Requires approval because `route.ts` is architecture the project documentation marks for sign-off.
- **E2 — Architecture map.** Static structure with live trace links, using only data that exists after E1.
- **E3 — Performance panel.** Measured stage sums, voice timing, tokens, cost, error counts, with n and the percentile policy.
- **E4 — Trace waterfall.** Duration bars now. Start-offset positioning only after §11 item 6.
- **E5 — Pricing single source and traffic separation.** Item 10 and item 12.

---

## 14. Schema changes, if any

- **Likely none for E1 and E2.** Data can go into existing `payload` JSON.
- **Possibly for E1:** an index on `events (trace_id)` would help the trace reads. Unverified: check the migrations before adding one.
- **For traffic separation (E5):** either a boolean on `profiles` (for example `is_synthetic`, set by a privileged script, following the `ai_showcase_access` pattern), or a naming convention on the eval teacher and bot accounts. Prefer the boolean, reviewed separately.
- **Do not add** a turns table, a metrics table, or a stage-timing table in this phase. Payload fields are sufficient until a real need is measured.

---

## 15. Risks

- **Showing a sum as a total** would overstate what is measured. Label it precisely.
- **Mixed traffic.** Benchmark and test runs are in the same table as student turns. Figures shown before the traffic filter exists would mislead.
- **Small samples** for reflection, practice, and failures. Percentiles would look precise and mean nothing.
- **Cost drift.** The pricing constants are duplicated. A model change without updating both would make cost wrong silently.
- **Silent observability loss.** Dropped event writes leave gaps no one sees.
- **Evaluation on the critical path.** A product and safety decision, not an optimisation. Changing it without a decision would change the safety story.
- **Avatar disconnected from turns.** The showcase cannot show Tavus latency per turn honestly until E1 item 5 is done.
- **Unverified items** in §9 (microphone denial, browser disconnect, LLM timeouts, retries). Each needs a check before it appears in the showcase.

---

## 16. What NOT to build

- Latency optimisation, parallelising agents, caching, or model changes. The graph is not yet proven and nothing has been measured against a target.
- Any change to Router behaviour, prompts, thresholds, or the judge.
- A new evaluation or experiment system (Phase F).
- Synthetic production metrics, or fabricated percentiles from small samples.
- Cost figures that are not derived from the stored token counts and the existing constants.
- Chain-of-thought, prompt text, or model reasoning in any panel.
- Embeddings or a vector store.
- Any change to the Tavus or Muse architecture.
- A waterfall with invented start offsets.
- Public exposure of any performance figure.

---

## Summary answers

- **Strongest existing technical evidence:** every LLM stage records tokens, model, and latency in the same event, and every voice turn is joinable to its chat turn through `voiceTraceId`.
- **Biggest observability gaps:** Planning latency is unmeasured. Total turn wall-clock does not exist. Cancelled turns and Tavus sessions are not correlated to turns.
- **Biggest latency contributor:** the Concept LLM call (~65% of the observed Concept turn). Evaluation (~12%) is on the student's wait.
- **Is current cost data trustworthy?** For comparing stages with each other, yes. It is a consistent estimate from fixed pricing. It is not a bill figure, and it excludes Muse and Tavus.
- **Do current traces support a real waterfall?** Only as duration bars. Start offsets are not stored, and Planning has no duration.
- **Do voice traces correlate cleanly with tutoring traces?** For the transcript and the chat turn, yes. For the avatar session, no.
- **Recommended implementation scope:** E1 only, as a small reviewed instrumentation change, then the architecture map and the performance panel. Do not start with the waterfall.

---

## E1 — Observability completion (implemented)

Scope: the four gaps the audit ruled blocking, plus the write-failure path. No pipeline behaviour, prompt, Router, judge, threshold, or benchmark change. No UI beyond the existing Flight Recorder and panel labels.

### Changes

- `web/src/app/api/chat/route.ts`: turn start, terminal outcomes, Planning duration.
- `web/src/lib/observability/trace.ts`: `logEvent` never throws, and reports its own failures.
- `web/src/lib/observability/transparency-provider.ts`: outcome, wall-clock, stage sum, Planning latency.
- `web/src/lib/voice/voice-event-payload.ts` (new): the browser event whitelist, moved out of the route so it can be tested.
- `web/src/app/api/voice/events/route.ts`: uses the moved whitelist.
- `web/src/components/voice/useAvatarSession.ts`: `avatar_speaking_started` carries the voice and avatar identifiers.
- `web/src/components/showcase/FlightRecorderSummary.tsx`, `web/src/design-system/patterns/TransparencyPanel/TransparencyPanel.tsx`: labels.
- Tests: `web/tests/observability-e1.test.ts` (new), `web/tests/transparency-provider.test.ts` (renamed field).

**Schema changes: none.** All new data lives in existing `events.payload` JSON.

### Event contract

| Event | Status | Fields added or changed | Meaning | Start boundary | End boundary | Unit | Trace ID | Nullable |
|---|---|---|---|---|---|---|---|---|
| `reply_sent` | existing | `wallClockMs` (new) | Reply persisted, outcome completed | Turn start (below) | Immediately before this event is written | ms | chat trace | `wallClockMs` null on pre-E1 rows |
| `safety_reply_sent` | existing | `wallClockMs` (new) | Safety decline persisted, outcome completed | Turn start | Immediately before this event is written | ms | chat trace | as above |
| `turn_cancelled` | **new** | `wallClockMs` | Student cancelled. Outcome cancelled, not an error | Turn start | Moment the cancelled path is taken | ms | chat trace | none |
| `reply_failed` | existing | `wallClockMs` (new); new reason `pipeline_exception` | Outcome errored | Turn start | Moment the failure is caught or the save fails | ms | chat trace | none |
| `learning_plan_created` | existing | `latencyMs` (new) | Planning completed | Immediately before the learner-state and concept calls | After the plan decision, before the event is written | ms | chat trace | none |
| `planning_failed` | existing | `latencyMs` (new) | Planning failed | Same | Moment the error is caught | ms | chat trace | none |
| `avatar_speaking_started` | existing | `voiceTraceId`, `conversationId`, `inferenceId` (new, validated) | Dr. Paws began speaking one reply | Browser speech start | Event write | none | browser event's own trace; link via `voiceTraceId` | each may be null if invalid |

Turn start: after authentication succeeds in `POST /api/chat`. The clock includes the rate-limit and demo-cap checks, body parsing, conversation lookup, the user-message write, and the whole pipeline. It excludes the network time before the handler runs, and the browser's rendering time.

Turn end: the moment the reply is persisted (for completed turns), or the cancel or error moment. Streaming to the browser is not an end point. The reply is complete when persisted, so first streamed token is not measured.

### Measured today

- Turn wall-clock, per terminal outcome, for turns written after E1.
- Planning duration, for turns that reached Planning after E1.
- Cancelled turns, with the stage durations that completed before cancellation.
- Avatar speech, linked to the voice turn and the Tavus conversation.

### Derivable today

- Stage sum (`stageLatencySumMs`): sum of the measured stage latencies. Labelled as a sum everywhere.
- Unmeasured residual per turn: `wallClockMs` minus stage sum. Shows work outside any stage.
- Outcome counts by terminal event.

### Not instrumented

- Time to first streamed token.
- Pre-pipeline and post-pipeline database work, individually.
- Knowledge reads, individually (inside Planning).
- Memory write duration and Reflection end boundaries beyond the existing Reflection latency.
- Tavus internal latency, and Tavus session start-to-first-audio.
- Muse and Tavus cost.
- Turns that were interrupted without reaching the cancel path (for example, a closed browser tab, if the stream stops before the handler observes it).
- Pre-E1 traces: no wall-clock, no outcome beyond the terminal event that exists.

### Deferred

- Stage start offsets, and a positioned waterfall (audit §7).
- Time to first token.
- Pricing single source (see below).
- Traffic classification field.
- Per-concept planning sub-timings. Planning is one stage, as audit §8 requires.

### Definition: total turn wall-clock

`wallClockMs` is `Date.now()` at the terminal event minus `Date.now()` at turn start, both server-side, both in `route.ts`. It is not the sum of stages, and it is never reconstructed from stage sums.

### Definition: Planning duration

`latencyMs` on `learning_plan_created` is `Date.now()` after `decidePlan` completes, minus `Date.now()` immediately before `buildPlanningContext` starts. It includes the learner-state read, the trigram concept search, the concept read, the three parallel knowledge reads, and the plan decision. It excludes Personalization, which runs after the event.

### Cancellation semantics

- `cancelled` means the student stopped generation (client Cancel, which aborts the request signal). It is never recorded as `errored`.
- A cancelled turn writes `turn_cancelled` with the elapsed time. Stage events that completed before the cancel remain as written. No duration is created for a stage that never completed.
- The outcome is derived from the terminal event. A cancelled turn has no `reply_sent`.
- **Limitation (documented, not fixed):** browser abort does not necessarily stop all upstream work. The Safety and Router calls run to completion before the pipeline checks the signal, and an in-flight model call only stops if the signal reaches it. E1 observes cancellation; it does not implement full pipeline cancellation or barge-in.

Observed on a live cancelled turn: outcome `cancelled`, wall-clock 6,721 ms, stage sum 5,452 ms. Safety 2,078 ms, Router 2,334 ms, and Planning 1,040 ms were recorded. No Teaching or Evaluation stage was recorded, since neither completed.

### Avatar to voice correlation

Cardinality, from the implementation:

- One Tavus conversation (session) spans many voice turns. The client keeps one session until it goes idle, ends, or fails (`useAvatarSession.ts`). It is not one session per turn.
- One voice turn produces at most one `avatar_speaking_started`, because speech start is recorded once per turn.
- Each spoken reply has its own `inferenceId`, a UUID the client creates for each turn.

Chain of identifiers:

```
avatar_session_started (conversationId)         ← server, own trace
        │ conversationId
avatar_speaking_started (voiceTraceId, conversationId, inferenceId)   ← browser, own trace
        │ voiceTraceId
voice_transcription_completed (trace_id = voiceTraceId)               ← server
voice_turn_timing (payload.voiceTraceId)                              ← browser
reply_sent (payload.voiceTraceId, trace_id = chat trace)              ← server
```

Identifiers are reused, not a new trace system. `voiceTraceId` was already in use; `conversationId` is Tavus's own ID; `inferenceId` is per reply and sent to Tavus with each echo.

Validation: `voiceTraceId` and `inferenceId` must be UUIDs, and `conversationId` must match `[A-Za-z0-9_-]{1,80}`. Anything else is stored as null. Only identifiers are stored. No audio, transcript, or video.

**Not verified live:** the browser speaking event. Exercising it needs a Tavus session and Muse, which cost paid minutes. The validation is unit-tested. The live chain above is unverified end to end.

### Observability write failures

- Before E1, `logEvent` caught a returned error and logged to `console.error`. A thrown exception (for example a network error) was not caught and would propagate into the tutoring stream. The docstring said "never throws", which was not true.
- Now `logEvent` catches both cases. A failed write is logged to `console.error` and reported to Sentry (`events write failed: <name>`, tag `component: observability`).
- No recursive event is written for a failed write. The Sentry report is the only extra output.
- The failure reporter is injectable for tests. Production uses Sentry.
- Tutoring behaviour is unchanged on success, and on failure it continues as before.

### Traffic classification findings

| Traffic type | Distinguishable today? | How |
|---|---|---|
| Benchmark / eval | **Yes, reliably** | `eval_run_items.trace_id` joins to `events.trace_id`. `eval_runs.is_public` and `teacher_id` also identify the run |
| Bot student used by the runner | Partly | `student_id` equals `EVAL_BOT_STUDENT_ID`, which is an environment value, not stored in the data |
| Showcase / demo account | Partly | `profiles.ai_showcase_access` marks showcase-authorized accounts, which include the demo account. It does not mark demo traffic as such. The demo account's identity is known only by its ID or email |
| Ordinary student | **No explicit field** | Only the absence of the other markers |
| Automated tests | **No** | Tests that run against the live system use the demo account, which is indistinguishable from demo traffic |

Recommendation: a single explicit `traffic_class` field on `profiles` (`student`, `showcase`, `benchmark`, `test`), set only by a privileged script. Not built in E1.

### Pricing duplication

Two copies of the same constants:

- `web/src/lib/llm/client.ts`: `MODEL = "claude-opus-4-8"`, $5 and $25 per million tokens, and `estimateCostUsd`. Used when events are written.
- `web/src/lib/agents/observability-agent.ts`: its own copy, kept to avoid importing the Anthropic SDK in a read-only module (per its comment).

Proposed single source: `web/src/lib/llm/pricing.ts`, exporting the model ID, the two rates, and `estimateCostUsd`. It has no SDK dependency, so both `client.ts` and `observability-agent.ts` can import it. A test asserts the two computations agree. Historical cost records are not changed. Stored costs were computed with the rates at the time, and a rate change would need a pricing version field, which is deferred.

Estimated cost is not provider billing, and Muse and Tavus costs remain excluded.

### ADR 003 verification

- **Exact decision:** split the tutoring flow into named, independently specified agents. The stated order is Safety → Router → Planning → Personalization → Concept/Practice/Assessment → Reflection → Memory → Evaluation, plus the read-only Observability Agent. Composed by direct function calls in `route.ts`, not one large prompt.
- **Rationale actually documented:** transparency and independent testability. Each stage is "independently inspectable" with its own logged output. Each agent's prompt is a pure, exported builder that can be tested without an API call.
- **Trade-off actually documented:** "Real cost: more LLM calls per turn." The ADR accepts this deliberately, in favour of transparency and testability over minimum token spend.
- **Audit representation:** the audit's table cited ADR 003 for three rationales it does not contain: that Planning decides how and Concept teaches what, that Evaluation is independent, and that Memory records rather than teaches. Those rows are now corrected above. The audit's Safety-before-Router row is also corrected: ADR 003 records the order and the cost, not the hard-gate reasoning.
- The ADR documents the agent pipeline. It says nothing about Evaluation sitting on the student's critical path. The audit's finding stands, and it has no ADR. The code comment saying evaluation should "never block learner interactions" contradicts the awaited call. That is still unresolved.

### Provider secret and client boundary

Checked on the production build (`web/.next/static`, client chunks):

- `sk-ant-` (the Anthropic key prefix): absent.
- `ANTHROPIC_API_KEY`, `TAVUS_API_KEY`, `MODEL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_STUDENT_PASSWORD`: absent.

**Substantiated:** none of these literal patterns appears in the client static chunks of the production build. Repository secret scan (tracked and untracked changes): clean.

**Not substantiated:** server bundles were not searched. Obfuscated or derived secrets were not searched for. Only the patterns above were checked. The claim is limited to these checks.

### Tests and build

- Typecheck: clean.
- Lint: clean.
- Tests: 353 of 353 pass. 13 are new in `observability-e1.test.ts`. The transparency test was updated for the renamed field.
- Production build: passes.
- Secret scan and client-bundle check: as above.

### Representative measured traces (live, demo account)

Completed text turn `b1891d0d`:

| Node | Measured |
|---|---|
| Safety | 1,816 ms |
| Router | 1,917 ms |
| Planning | 1,180 ms (new) |
| Concept | 10,670 ms |
| Evaluation | 2,317 ms |
| Stage sum | 17,900 ms |
| Wall-clock | 20,000 ms |
| Outcome | completed |

The 2.1 s difference is the residual. It is work the instrumentation doesn't attribute to a stage: the rate-limit and demo-cap checks, the conversation lookup, the user-message write, the assistant save, and glue between stages.

Cancelled turn `0f7c1900`: described above. Outcome `cancelled`, wall-clock 6,721 ms, stage sum 5,452 ms.

Voice turn and avatar correlation: **not run live** (Muse and Tavus cost). Unit-tested only.

### Overhead and risk

- Overhead: one `Date.now()` pair per stage (already present), one additional `Date.now()` for planning, one terminal `turn_cancelled` write on cancelled turns only. No additional database queries on the completed path. Payload size grows by a few bytes.
- `logEvent` now catches exceptions it previously let through. That changes failure handling in exactly one direction: a failing observability write no longer aborts a turn. Previously, a thrown exception would have. This is a behaviour change, and it is the intended one.
- The residual 2.1 s is a known blind spot. It should be attributed in a later phase, not guessed now.
- Cancellation observability depends on the browser actually sending the abort. A tab closed without Cancel is not recorded (see "Not instrumented").
- Sentry must be configured with a DSN in production for write failures to surface beyond the server log.

---

## E3 — Performance and AI economics (implemented)

Scope: an authorized showcase page that reports measured timing, token counts, and estimated inference cost, each with its sample size. No optimisation, no change to pipeline behaviour, prompts, the Router, the judge, thresholds, or the benchmark. Speed and cost are shown alongside quality, which lives in the Evaluation Lab.

### Data included and excluded

| Traffic | Treatment | Why |
|---|---|---|
| Unclassified ordinary traffic (students, the demo account, any tests) | **Included** | Not verified as real-student traffic. Students, the demo account, and tests cannot be told apart |
| Benchmark runs (`eval_run_items.trace_id` join) | **Excluded** from every metric | They are a fixed synthetic workload. They are reported only in the Evaluation Lab. They also write no terminal turn event, because the runner calls the pipeline directly |
| AI Tutor automatic requests (`source = tutor_auto`) | **Excluded** from every metric and counted separately | These are system-initiated requests, not student questions |

Traffic classes are computed in SQL by `showcase_performance_rows()` (migration 0032), which checks `ai_showcase_access` before returning anything. Each row carries a traffic class, a model, measured numbers, and no student identifier, no payload text, and no reply content.

### Metric definitions

| Figure | Source event(s) | Calculation | Unit | Inclusion | Exclusion | Limitation |
|---|---|---|---|---|---|---|
| Stage latency (Safety, Router, Concept, Practice, Assessment, General, Reflection, Evaluation) | `message_received`/`safety_blocked`, `intent_detected`, `concept_explained`, `practice_generated`, `assessment_completed`, `llm_call_succeeded`, `reflection_completed`, `evaluation_completed` | Each call's own measured `latencyMs` (`evaluationLatencyMs` for Evaluation) | ms | Ordinary traffic, one row per call | Benchmark, AI Tutor auto | Wall-clock of the call only. No queueing or network time before it |
| Planning | `learning_plan_created` | Measured duration from before the learner-state read to the completed plan decision | ms | Turns after E1 | Pre-E1 turns | Excludes Personalization, which runs after it |
| Speech-to-text | `voice_transcription_completed` | Muse fetch time | ms | Ordinary | Benchmark | Muse cost not included |
| Turn wall-clock | `reply_sent`, `safety_reply_sent`, `reply_failed`, `turn_cancelled` | Server elapsed time from authentication to the terminal event | ms | Turns after E1 | Pre-E1 turns | Not the sum of stages |
| Measured stage share | Core stage calls above | Each stage's summed latency ÷ all core stages' summed latency | % | Ordinary | Benchmark, AI Tutor auto | Not a waterfall: no start times, and unmeasured work is outside the total |
| Tokens and estimated cost | Stage events with `model`, `inputTokens`, `outputTokens` (`evaluation…` for Evaluation) | Tokens are summed from provider `usage`. Cost = tokens × application rates (`pricing.ts`) | tokens, USD (ESTIMATED) | Ordinary | Benchmark, AI Tutor auto | Estimate, not provider billing. Priced with today's rates, not the rates at write time |
| Cost per observed turn | Every LLM call of one turn | Sum of that turn's call estimates, counted only if every call's model is priced | USD (ESTIMATED) | Ordinary turns with LLM calls | Any turn with an unpriced call | Turns differ widely in intent and length |
| Voice segments | `voice_turn_timing` (browser) | Segment durations as reported by the browser | ms | Ordinary voice turns | Benchmark | Browser clock, not Tavus. Each segment has its own n, because older turns report different fields |
| Typed versus spoken stage sum | Core stage calls, grouped per turn by modality | Per-turn sum of measured core-stage latency | ms | Turns with a recorded modality | Turns with no modality | Compares measured stage time only; the voice turn's browser segment is a different measure |
| Outcomes | Terminal events | Counts only | count | Ordinary | Benchmark, AI Tutor auto | No rates: samples are too small |

### Pricing consolidation

- New `web/src/lib/llm/pricing.ts` is the typed source for inference prices. It returns no price for an unknown model. `priceFor()` checks the model key with `hasOwnProperty`, so prototype names are not priced.
- `web/src/lib/agents/observability-agent.ts` now imports it. Its numbers are unchanged.
- **Not consolidated:** `web/src/lib/llm/client.ts` still holds its own copy of the same two rates. That file is pinned by a hash guard test (`homework-generator-isolation.test.ts`) and its own standing rule requires explicit sign-off before a change. A test compares the two copies and fails if they drift. Switching `client.ts` to the shared module needs your approval.
- Historical stored costs (`estimatedCostUsd`, `evaluationCostUsd`) are not changed. The showcase recomputes estimates from token counts with the current rates. Rates are not versioned per event, so a future rate change would move historical estimates unless a pricing version is recorded. That is deferred.

### Sample sizes at the time of implementation

Computed from the production database through the same mapping as migration 0032 (scratch run, not committed):

| Figure | n |
|---|---|
| Ordinary turns | 195 |
| AI Tutor automatic requests (excluded) | 8 turns |
| Benchmark traces (excluded) | 29 |
| Turns with instrumented wall-clock | 2 |
| Turns with a Planning duration | 2 |
| Safety calls | 184 |
| Router calls | 163 |
| Concept calls | 48 |
| Practice calls | 8 |
| Assessment calls | 18 |
| General reply calls | 74 |
| Reflection calls | 18 |
| Evaluation calls | 75 |
| Muse transcriptions | 43 |
| Voice turns with question→transcript timing | 33 |
| Voice turns with transcript→reply timing | 33 |
| Voice turns with reply→first-audio timing | 7 |
| Voice turns with first-audio total | 21 |
| Turns with a fully priced cost | 179 |

Medians appear only at n ≥ 30, and p90 only at n ≥ 50. The wall-clock figures (n = 2) are shown as observed values only.

### What the measurements show, and what they do not

- **Measured:** Concept calls have a median of about 9.6 s (n = 48, range 7.6–34.7 s). Router has a median of about 2.4 s (n = 163). Safety has a median of about 1.9 s (n = 184), but one call measured about 116 s, and the cause has not been investigated.
- **Measured share:** across all ordinary turns, Safety is about 26% of measured core-stage time and the unguided general reply about 22%. Concept is about 18%. Concept is not the largest share across all turns, because Safety runs on every turn.
- **Per-turn finding:** on turns that reach the Concept call, the Concept call is the longest measured stage on enough turns to support a conclusion. The interpretation is emitted only when n ≥ 30 and the proportion is above 50%.
- **Voice:** Muse transcription has a median of about 3.0 s (n = 43). Transcript→reply has n = 33; reply→first-audio has n = 7, so no voice comparison between those two segments is drawn.
- **Text versus spoken stage sums:** medians are close (about 11.1 s for typed turns, n = 30; about 11.0 s for spoken turns, n = 37). The sample is small, so no difference is claimed.
- **Estimated cost:** the median cost per fully priced turn is about $0.045 (n = 179), with a range of about $0.007 to $0.118. Total estimated spend across these calls is about $7.81 (567 calls, about 1.19 million tokens).
- **Reliability:** 194 completed, 1 cancelled, 0 errored, out of 195 ordinary turns. Counts only.

### Measurement gaps shown in the UI

Time to first streamed token; Context and knowledge retrieval durations; no positioned waterfall; Muse and Tavus cost; traffic that cannot be separated; small samples; pre-E1 turns with no wall-clock or Planning duration.

### Live verification

Migration 0032 was applied to production. The demo showcase account loads `/showcase/performance` on desktop (1440 px) and mobile (390 px), with no horizontal overflow. A signed-out visit redirects to sign-in. An anonymous call to `showcase_performance_rows()` is refused by the database (401, permission denied).

The first live run showed fewer rows than the database holds. PostgREST caps each response at 1000 rows, and the loader read only the first response (1,278 rows exist). The loader now pages through all rows in a fixed order (`created_at`, `trace_id`, `event_name`), and a test covers a capped response. After this fix the page matches the offline figures above.

Not live-tested: an authenticated account without showcase access. Verifying it would need a non-showcase account, and none was created for this check. The refusal is enforced in the function's SQL.
