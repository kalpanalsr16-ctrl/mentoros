# Phase F: Latency × Quality Experiment (Audit)

Status: audit only. No code, schema, prompt, model, Router, Safety, or Evaluation changes. No benchmark run, no paid voice traffic, no commit.

Baseline: the Phase E production measurements (`docs/PHASE_E_ARCHITECTURE_PERFORMANCE.md`, E3 section). Ordinary turns n=195. Medians shown only at n≥30. The turn wall-clock (n=2) and Planning (n=2) figures are observed values, not statistics.

Goal: improve perceived responsiveness for the student while protecting learning quality, Safety, and reliability. The goal is not to shrink every number.

Sources: `web/src/app/api/chat/route.ts` (`POST` and `runTutoringPipeline`, lines 443–1073; `runEvaluationAgent`, lines 1087–1186), `web/src/lib/agents/safety-agent.ts`, `web/src/lib/agents/planning-agent.ts`, `web/src/lib/agents/planning-context.ts`, `web/src/lib/agents/context-agent.ts`, `web/src/lib/llm/client.ts`, `web/src/lib/chat/streaming-event-builder.ts`, `web/src/components/chat/ChatShell.tsx`, `web/src/components/voice/useAvatarSession.ts`, `web/src/lib/security/rate-limit.ts`.

---

## 1. Request lifecycle, in order

### 1a. Before the stream starts (inside the POST handler, before `new ReadableStream`)

1. `supabase.auth.getClaims()` (auth read).
2. `turnStartedAt` is set here. Wall-clock starts here.
3. `checkRateLimit` (a `messages` count query, `rate-limit.ts`). Rejected requests exit here.
4. `checkDemoDailyLimit` (another count query, demo account only).
5. Body parse and validation.
6. Conversation resolution (a `conversations` read, and a create when there is no conversation).
7. Insert of the user message (`messages` write).
8. Retry only: reads of the last assistant and user rows, then the `superseded_at` update.

Steps 3–8 are awaited sequentially, and they sit inside wall-clock. No stage timer covers them.

### 1b. Inside the stream, `runTutoringPipeline`

| # | Step | Sync? | Writes/reads | LLM call | Awaited before the student sees anything? |
|---|------|-------|--------------|----------|--------------------------------------------|
| P1 | `checkMessageSafety` (Layer 1, keyword filter) | yes, local | none | no | yes (cheap) |
| P2 | `buildConversationContext` (history read, only if Layer 1 passes) | await | `messages` read | no | yes. Not in any stage timer |
| P3 | `evaluateSafety` Layer 2 (`classifySafetyWithClaude`) | await | `message_received` / `safety_blocked` event | **yes, always when Layer 1 passes** | yes. Fails closed |
| P4 | `classifyIntent` (Router, `classifyIntentWithClaude`) | await | `intent_detected` / `routing_failed` event | **yes** | yes. Fails open to the unguided path |
| P5 | `buildPlanningContext` (learner state read, concept search, concept fetch, then three parallel reads) | await | reads only | no | yes. Needs the Router topic |
| P6 | `decidePlan`, `decidePersonalization` | sync, deterministic | none | no | yes |
| P7 | Practice / Assessment / Concept selection | by intent | none | by branch (below) | yes |
| P8 | Branch LLM call | await | none | yes | yes |
| P9 | `runEvaluationAgent` (Evaluation, `evaluateInteraction`) | await | `evaluation_completed` event | **yes** (Concept, Practice, Assessment only) | **yes. It runs before `insert_assistant_message`** |
| P10 | Assessment only: Reflection (`reflectOnSession`) | await | `reflection_completed` event | **yes** | yes |
| P11 | Assessment only: Memory (`updateLearnerProfile`) | await | `learner_concept_mastery` write, `learner_profile_updated` event | no | yes |
| P12 | `insert_assistant_message` (RPC) | await | `messages` write | no | yes. Reply is persisted here |
| P13 | `reply_sent` event (with wall-clock) | await | `events` write | no | yes |
| P14 | `done` event | sync | none | no | the student receives the full reply here |

### 1c. Per turn type

**Concept teaching turn** (Router intent is a teaching request, plan is not Diagnostic, concept resolved)
- Order: P1 → P2 → P3 (LLM) → P4 (LLM) → P5 → P6 → P8 Concept (LLM, structured output via `messages.parse`) → P9 Evaluation (LLM) → P12 → P13 → P14.
- Synchronous LLM calls: 4 (Safety L2, Router, Concept, Evaluation).
- Streaming: none. `generateConceptExplanation` returns a parsed object, so the student sees no text chunks. The first content is the `done` event.
- Evaluation: on the critical path, before the reply is saved.

**Practice turn** (Router intent is Practice, concept resolved)
- Order: same as Concept, with P8 Practice (`createPracticeSet`, structured) in place of Concept.
- Synchronous LLM calls: 4 (Safety L2, Router, Practice, Evaluation).
- Streaming: none. Practice content is formatted into a reply after the structured call.
- Evaluation: on the critical path.

**Assessment turn** (Router intent is Assessment)
- Order: P1 → P2 → P3 → P4 → P5 → P6 → P8 Assessment (LLM, structured) → P9 Evaluation (LLM) → P10 Reflection (LLM) → P11 Memory (DB write) → P12 → P13 → P14.
- Synchronous LLM calls: 5 (Safety L2, Router, Assessment, Evaluation, Reflection).
- Streaming: none.
- Evaluation, Reflection, and the Memory write all sit before the reply is saved. The mastery update is sent in the `done` payload, so it depends on Memory finishing.

**General, unguided reply** (not clarification, not Practice/Assessment/Concept, or those branches failed)
- Order: P1 → P2 → P3 (LLM) → P4 (LLM) → P5 → P6 → P8 `generateTeachingReplyStreaming` (LLM, text stream) → P12 → P13 → P14.
- Synchronous LLM calls: 3 (Safety L2, Router, General streamed).
- Streaming: yes. `events.chunk` is emitted for every text delta from the SDK. This is the only streamed path.
- Evaluation: **not run.** No `runEvaluationAgent` call exists on this branch (see section 6).
- Cancellation: `request.signal` is passed into the stream, so a client abort stops the upstream call.

**Voice-initiated Concept turn**
- Before `/api/chat`: Muse transcription (`/api/voice/transcribe`, server-side Meta Muse call, measured median 3.0 s, n=43).
- Then the same pipeline as the typed Concept turn. The request carries `modality: "voice"` and `voiceTraceId`.
- Avatar speech: `ChatShell` begins Dr. Paws speech only on the first `chunk` event, or after `done` if no chunks arrived. A Concept turn has no chunks, so speech starts after the full reply is received (`finishSpokenReply` with `streamed = false`).
- Synchronous LLM calls: 4 on the server, plus the Muse call before the request.

---

## 2. Critical-path classification

### MUST COMPLETE BEFORE ANSWER

These produce the reply content, or the reply cannot be trusted or saved.

- Safety Layer 2 (P3). Blocks unsafe content before any teaching call. Must stay before generation.
- Concept, Practice, or Assessment call (P8), or the General streamed call. Produces the reply content.
- Router (P4). Decides the branch and clarification. Changing its position would change routing.
- Planning context reads (P5), because the teaching prompt and the branch choice depend on them.
- `insert_assistant_message` (P12) and `reply_sent` (P13). The reply is not delivered as saved until these succeed.

### CURRENTLY AWAITED BUT POTENTIALLY MOVABLE

These run before the reply is saved or sent, but they do not change the reply content. The code already says they should not block the student.

- **Evaluation (P9) on Concept, Practice, and Assessment turns.** About 2.0 s median (n=75). It never changes the reply (`runEvaluationAgent` doc comment, route.ts 1080–1085). The comment says "Evaluation should never block learner interactions," yet the call is awaited before P12. Moving it after `done` is the clearest candidate.
- **Reflection (P10) on Assessment turns.** Measured range 3.5–12.5 s (n=18, median not shown). It is internal, and its failure does not change the reply. Its output goes into Memory.
- **Memory write (P11) on Assessment turns.** The mastery update is returned to the student in `done`, and the next turn's Planning reads learner state. Moving it has ordering consequences (section 5).
- **Layer 1 history read (P2) and planning reads (P5).** Some reads could start earlier, for example the learner-state read, which does not depend on the Router. This is small.

### POST-RESPONSE WORK

Already after the reply is saved and sent:

- `reply_sent` and `done` are sent after P12. `reply_sent` is logged before `done`, so the client sees the reply after the write.
- Nothing else runs after `done`. The stream closes in `finally`.

The Phase E finding "reply saved and sent after all awaited work" means the post-response slot is currently empty for every turn type.

### UNKNOWN / NOT INSTRUMENTED

- **Time to first streamed token** (general path). Not recorded. Chunks are emitted immediately, but no timestamp exists.
- **Time to first content for Concept, Practice, and Assessment.** This equals the `done` event. Its time is not recorded separately, but it is the same as `wallClockMs` in `reply_sent`.
- **Pre-stream DB work** (1a steps 3–8). Inside wall-clock, outside every stage timer. Its duration is not known.
- **Context read P2 and its share of time.** Not a stage, so unknown.
- **Stage start times.** None stored, so no waterfall is possible.
- **Client-side rendering delay.** Not measured.
- **Muse cost and Tavus cost.** Not instrumented.
- **Dr. Paws first audio** is measured in the browser (`voice_turn_timing`), but the `replyStartAt` value is taken when `beginTurn` is called (first chunk, or `done` for non-streamed turns). For Concept turns, that is after the whole pipeline. See section 6.

---

## 3. Synchronous LLM calls and estimated critical path

Medians are from the E3 measurements. These are sums of medians, not medians of totals, so they are an approximation.

| Turn type | Sequential LLM calls | Measured medians on the path | Approximate sum | Notes |
|-----------|----------------------|------------------------------|-----------------|-------|
| Concept | 4 (Safety, Router, Concept, Evaluation) | Safety 1.9 s, Router 2.4 s, Planning ~1.0–1.2 s (n=2), Concept 9.6 s, Evaluation 2.0 s | ~17 s | Excludes DB writes and pre-stream work. Turn wall-clock n=2 observed: 6.7 s and 20.0 s |
| Practice | 4 | Practice median not shown (n=8, range 5.6–12.8 s) | not estimated (n<30) | Same shape as Concept |
| Assessment | 5 (Safety, Router, Assessment, Evaluation, Reflection) | Assessment median not shown (n=18, range 4.9–8.8 s), Reflection range 3.5–12.5 s | not estimated (n<30) | Memory write also awaited |
| General | 3 (Safety, Router, General) | General median 8.1 s (n=74) | ~12 s before streaming ends | First token time unknown |

Concept turns: the student waits for Safety, Router, Planning reads, Concept, and Evaluation before any content appears. The Concept call is the largest single LLM stage on those turns (median 9.6 s), and Evaluation adds a further ~2 s before the reply.

---

## 4. Cancellation semantics

Client: `ChatShell` creates an `AbortController`, passes its signal to `fetch`, and aborts it on Cancel (`abortControllerRef.current?.abort()`).

Server, per branch:

- **General (streamed).** `request.signal` is passed to `generateTeachingReplyStreaming`, so the upstream Anthropic stream is aborted. The pipeline returns `cancelled: true`, nothing is saved, and `turn_cancelled` is logged. This is consistent with the production data: the one cancelled turn in the window (n=1) has only `turn_cancelled` and no reply event.
- **Concept, Practice, Assessment (not streamed).** `signal` is not passed into `explainConcept`, `createPracticeSet`, `evaluateResponse`, or `runEvaluationAgent`. These calls run to completion, and their tokens are billed. The reply is then saved by `insert_assistant_message`, because nothing checks `signal` before P12.
- **Expected after cancel on these paths (from code, not observed in production):** `reply_sent` is logged, then `events.state("Completed")` writes to a stream whose consumer has gone. The enqueue should throw, which lands in the `catch`, where `request.signal.aborted` is true, so `turn_cancelled` is logged too. The trace would then contain both `reply_sent` and `turn_cancelled`, and a saved reply the student cancelled. This needs a controlled test before it is claimed as fact.
- **Evaluation after cancel.** Evaluation still runs and bills tokens, because it is awaited.

Cancellation is therefore honest only on the General path. On the other three paths, Cancel stops the display, not the work or the save.

---

## 5. Candidate interventions

Each is a candidate for investigation only. None is implemented.

### C1. Move Evaluation after the reply on Concept, Practice, and Assessment turns

1. **Current:** Evaluation (P9) is awaited before P12. Median 2.0 s, n=75. The reply waits for it.
2. **Proposed:** persist the reply (P12), send `reply_sent` and `done`, then run Evaluation in the same request after the response is sent, using the platform's post-response mechanism (for example Next's `after()`). The reply content is unchanged.
3. **Expected benefit:** about 2 s median off time to first content on these turns. About 7% of measured core-stage time is Evaluation. This also shortens `wallClockMs`, which is a measurement discontinuity (see section 6).
4. **Quality risk:** none to the reply, since Evaluation never changes it. Risk to the Evaluation Lab's data: none, because the Lab runs through its own runner.
5. **Safety risk:** none. Safety is untouched.
6. **Observability impact:** `evaluation_completed` arrives after `reply_sent`. The transparency panel and the trace summary must tolerate a trace whose evaluation is still pending. Evaluation failures become unreported unless logging is kept in the post-response hook.
7. **Implementation complexity:** low to medium. One call-site move in `route.ts`, plus a post-response mechanism that survives the request on the deployment platform.
8. **Reversibility:** high. A flag can restore the awaited call.
9. **Measurement:** median time to `done` on Concept, Practice, and Assessment turns, n≥30 before and after. Coverage: `evaluation_completed` per trace. Guardrail: `evaluation_failed` rate, judge-dimension distribution (section 7).

### C2. Move Reflection and the Memory write off the critical path on Assessment turns

1. **Current:** Reflection (P10) and Memory (P11) are awaited before P12. The mastery update is in the `done` payload.
2. **Proposed:** send the reply first, then run Reflection and Memory after the response. The mastery update would need a separate delivery path, because it can no longer be in `done`.
3. **Expected benefit:** Reflection range 3.5–12.5 s on Assessment turns. Median not shown (n=18).
4. **Quality risk:** the next turn's Planning reads learner state. If it arrives before the Memory write lands, personalization uses stale mastery. The student could see inconsistent advice.
5. **Safety risk:** none directly.
6. **Observability impact:** `learner_profile_updated` arrives after `reply_sent`. The mastery note in the chat UI changes behaviour.
7. **Implementation complexity:** medium. It changes the UI contract for the mastery note.
8. **Reversibility:** medium. The write ordering is hard to undo once students have seen the new note timing.
9. **Measurement:** time to `done` on Assessment turns. Next-turn consistency test: a second turn sent within a few seconds of an Assessment turn must read the updated mastery.

### C3. Stream Concept or Practice replies, so content appears before generation finishes

1. **Current:** Concept and Practice use structured output (`messages.parse`). No chunks are sent, so the student sees only the "Teaching" state until `done`.
2. **Proposed:** stream the teaching prose as it is generated. This needs a different output format, or incremental parsing of the structured output.
3. **Expected benefit:** the largest perceived benefit, since first content would move from the end of Evaluation (~17 s median path) to the first token. The size is not measured, because first-token time is not instrumented.
4. **Quality risk:** high. The output contract (`nextStep`, `confidence`, and the structured fields) changes, and prompts must change. Prompts are out of scope for this phase.
5. **Safety risk:** Safety is a pre-generation gate. No post-generation output check exists today for Concept replies either, so streaming does not add a new gap, but a partial stream cannot be reviewed before the student sees it.
6. **Observability impact:** a new first-content event is needed (section 8).
7. **Implementation complexity:** high.
8. **Reversibility:** medium. The output format is user-visible.
9. **Measurement:** time to first content, n≥30. Guardrail: LLM judge dimensions and routing (section 7).

### C4. Reduce or change the Router and Safety calls before teaching

1. **Current:** Safety Layer 2 (median 1.9 s, n=184) and Router (median 2.4 s, n=163) are two sequential Opus calls before any teaching work.
2. **Proposed (investigate only):** a smaller or different model for the Router, or skipping the Router call when intent is already explicit. Safety stays as it is.
3. **Expected benefit:** up to about 2 s per turn. Not measured. Model latency is not known until tested.
4. **Quality risk:** misrouting. A Practice or Assessment request sent to the Concept path changes the whole turn. Routing correctness is the guardrail.
5. **Safety risk:** Safety must not change. Router changes must not affect Safety's fail-closed behaviour.
6. **Observability impact:** `intent_detected` payload model changes. Pricing constants change if the model changes.
7. **Implementation complexity:** low to medium.
8. **Reversibility:** high.
9. **Measurement:** routing exact match on the golden set (Evaluation Lab section A), `routing_failed` rate, Router latency. Model change requires explicit approval.

### C5. Overlap independent reads before Router completes

1. **Current:** `learnerStateProvider.getLearnerState` in Planning starts only after Router returns. It does not depend on Router.
2. **Proposed:** start the learner-state read alongside Safety Layer 2, and use its result when Planning runs.
3. **Expected benefit:** small. One DB read, not measured. The three Planning reads that depend on the topic stay sequential.
4. **Quality risk:** none. The read is the same.
5. **Safety risk:** none. Reads produce no output, and blocked messages simply discard the result.
6. **Observability impact:** Planning latency would change definition. Needs a note.
7. **Implementation complexity:** low.
8. **Reversibility:** high.
9. **Measurement:** `learning_plan_created` latency, n≥30.

**Ranking:** C1 first, then C5 as a low-risk follow-up. C2 and C3 need the perceived-latency instrumentation and product decisions. C4 needs model-level evaluation and approval.

---

## 6. What the code contradicts in the current interpretation

1. **"Concept dominates latency."** True only on Concept turns. Across all ordinary turns, Safety is the largest measured share (26%). This is already stated in E3.
2. **"Evaluation never blocks learner interactions."** The code comment and the agent documentation say this, but Evaluation is awaited before the reply on three of four paths. The documentation and the code disagree.
3. **"Evaluation covers 100% of learner interactions."** The General branch never calls `runEvaluationAgent`. Evaluation n=75 is close to Concept, Practice, and Assessment combined (48 + 8 + 18 = 74), which is consistent with General turns never being evaluated.
4. **Reply→first-audio looks small (median not shown, n=7, range 1.0–1.9 s).** It is measured from `replyStartAt`, which is set when `beginTurn` is called. For non-streamed turns that is the `done` event, so the Concept pipeline is excluded by definition. The honest voice measure for these turns is transcript→reply (median 14.9 s, n=33) and question end→first audio (n=21, range 11.5–47.3 s).
5. **Turn wall-clock "from authentication to reply saved".** Correct, but it includes rate-limit, conversation, and insert work that no stage timer covers. The stage shares therefore cannot sum to wall-clock, and the E3 page says so.
6. **Benchmark numbers are not route timings.** The benchmark runner calls the pipeline directly and writes no reply events, so Evaluation Lab results contain no wall-clock or first-content measures. They measure quality, not responsiveness.
7. **Safety's 116 s outlier is still not explained.** It sits within a stage that is otherwise 1–2 s. The cause is unknown.

---

## 7. Quality guardrail (Evaluation Lab, not yet run)

The experiment is judged on both speed and quality. Latency alone does not decide it.

Use the existing Evaluation Lab sections:

- **A. Deterministic checks.** Router's actual decision against the human-authored expected agent, per golden case. Exact match.
- **B. Human-authored ground truth.** The expected agent per case. Not generated by a model.
- **C. LLM-as-judge.** Evaluation Agent scores. These are judgements, not ground truth. Run-to-run variance must be measured by repeating runs, and shown as a spread, not a single number.

Compare BEFORE and AFTER on:

- routing correctness (section A/B),
- deterministic checks (section A),
- LLM judge dimensions, with the stochasticity caveat (section C, several runs per arm),
- latency (wall-clock and first content, from ordinary traffic, not the benchmark),
- tokens and estimated cost,
- errors and cancellations.

Rules: do not tune against individual golden cases. Do not rerun the benchmark until the experiment is approved.

For C1 specifically, reply content is unchanged, so the expected result on the quality side is no change. The guardrail's job is to confirm that: the judge distribution, routing, and deterministic checks stay within the measured run-to-run spread, and that Evaluation still runs for every eligible turn.

---

## 8. Perceived latency and instrumentation

What can be distinguished today:

| Moment | Recorded? | Source |
|--------|-----------|--------|
| Request received (after auth) | Implicitly, as `turnStartedAt` | not logged as its own event |
| Safety L2 finished | Yes | `message_received` created_at and `latencyMs` |
| Router finished | Yes | `intent_detected` `latencyMs` |
| Planning finished | Yes | `learning_plan_created` `latencyMs` |
| First useful content (Concept, Practice, Assessment) | Equal to `done` time, not logged separately | `reply_sent` `wallClockMs` is near it |
| First streamed token (General) | No | not recorded |
| Response completed (reply saved) | Yes | `reply_sent` `wallClockMs` |
| Evaluation completed | Yes | `evaluation_completed` `evaluationLatencyMs` |
| Voice playback started | Yes, in the browser | `voice_turn_timing` `replyStartToAvatarAudioMs` |

Does first-content timing materially improve the experiment? Yes. Without it, C3 cannot be measured, and C1 is measured only through total time to `done`. The "first useful content" for Concept turns is the same moment as `done`, so the difference matters most for the General path, where the current data has no first-token timestamp.

**Smallest instrumentation change (not implemented):** in the route's stream wrapper, record the elapsed time at the first `chunk`, and at `done` for non-streamed turns. Add a `firstContentMs` field to the `reply_sent` payload. No new event, no new table. The performance RPC would need one more column, which is a migration, so it should be planned with the experiment, not as a separate change.

---

## 9. Voice

Improving the core tutoring path would materially improve voice responsiveness for non-streamed turns. A voice Concept turn does not begin speaking until `done`, so its transcript→reply time is the core pipeline time (median 14.9 s, n=33). Muse transcription (median 3.0 s, n=43) is a separate, smaller contributor, and it sits before the request.

Muse and Tavus-specific optimization is not justified by the current data. Core-path changes (C1, C3) matter more. No paid voice traffic was generated in this audit.

---

## 10. Recommended first experiment

**C1: move Evaluation after the reply on Concept, Practice, and Assessment turns.**

- Why first: the largest reduction in time to `done` for the smallest quality risk. The reply content is decided before Evaluation runs, so the reply is unchanged. Complexity is low, and reversal is a flag.
- Prerequisite: the `firstContentMs` instrumentation from section 8, so the effect on first content is measured directly, not inferred from `done`.
- Caveat: moving Evaluation changes the `wallClockMs` definition, because wall-clock currently ends after Evaluation. Before and after numbers must be reported with that boundary noted.

**Success metric:** median time to first content (`done` on these turns, after the instrumentation), n≥30 before and after, on ordinary traffic.

**Quality guardrail:** section 7. The judge distribution and routing must stay within the run-to-run spread, and Evaluation must still run for every eligible turn (`evaluation_completed` coverage).

---

## 11. Files for the first experiment

- `web/src/app/api/chat/route.ts`: move the `runEvaluationAgent` calls on the Concept, Practice, and Assessment branches to after `done`, behind a flag. Add `firstContentMs` to `reply_sent`.
- `web/src/lib/chat/streaming-event-builder.ts`: record the first-chunk timestamp (or the first `done`).
- A post-response mechanism (for example `after()` from `next/server`), if confirmed to be available on the deployment target.
- `web/src/lib/observability/transparency-provider.ts`: tolerate a trace whose evaluation arrives after `reply_sent`.
- `web/src/lib/showcase/performance/performance-metrics.ts`, `get-performance-rows.ts`, and a migration for `firstContentMs` in the RPC, when the experiment's metrics are added.
- Tests: `web/tests/` for the flag and the evaluation timing.

No schema change is needed for the flag. The migration is needed only for the performance page.

---

## Open questions for review

1. Confirm the platform mechanism for post-response work on the deployment target before C1 is approved.
2. Confirm whether the cancelled-Concept behaviour (reply saved, then `turn_cancelled`) should be tested in a controlled way before C1 changes the cancellation path.
3. Decide whether the wall-clock boundary should move with C1, or stay at the saved reply with Evaluation excluded.
4. Confirm whether the "Evaluation never blocks" documentation is the intended rule. If so, C1 is a correction, not an optimization.

---

## Implementation: C1 and measurement contract (uncommitted)

### E1 wall-clock, and whether C1 changed it

E1 definition (`PHASE_E_ARCHITECTURE_PERFORMANCE.md`, event contract and "Definition: total turn wall-clock"):
- Start: turn start, after authentication (`turnStartedAt` in `POST`, before the rate-limit check).
- End: reply persisted. Field written as `reply_sent.wallClockMs`, measured immediately before that event is written.

Before C1, Evaluation for Concept, Practice, and Assessment ran before the save. So the E1 value on those turns included Evaluation. Assessment's Reflection and Memory also ran before the save and still do.

C1 moved the save ahead of Evaluation. The same field then measured a shorter interval on those turns, so C1 did change the meaning of `wallClockMs`. That is fixed as follows.

### Fields now written to `reply_sent` and `safety_reply_sent`

| Field | Start | End | Written when | Meaning |
|---|---|---|---|---|
| `wallClockMs` | turn start (E1) | reply persisted, after any pre-save work (Evaluation before C1; Reflection and Memory on Assessment) | only when Evaluation is not deferred (General, clarification, safety decline, fallback) | unchanged E1 meaning |
| `replyCompletedMs` | turn start (E1) | reply persisted | always | learner-facing reply completion; equals `wallClockMs` on turns without deferred Evaluation |
| `firstContentMs` | turn start (E1) | first learner-visible model output | only for model-generated replies (see below) | first useful content |
| `evaluationLatencyMs` (on `evaluation_completed` / `evaluation_failed`) | Evaluation call start | Evaluation call end | after the save on Concept, Practice, and Assessment; unchanged payload | Evaluation latency, separately instrumented |

Historical records: `wallClockMs` on pre-C1 Concept, Practice, and Assessment turns includes Evaluation. Records written after C1 on those turns do not carry `wallClockMs`. Use `replyCompletedMs` for those, and only compare it with a pre-C1 `wallClockMs` after the boundary is noted (see the table below).

### `firstContentMs` semantics

- **Streamed (General).** Recorded at the first non-empty text delta (`events.chunk`). The `state` and `done` events are not counted. Empty deltas do not count.
- **Non-streamed model replies (Concept, Practice, Assessment).** Recorded at reply save. The student receives `done` one event write later, so first content and reply completion coincide here.
- **Clarification, safety declines, and fallbacks.** Never recorded. They are not model output, so the metric has no valid meaning for them.

### Evaluation after the response

Evaluation (`runEvaluationAgent`, unchanged) is registered with `after()` once the pipeline returns. It receives the same request as before: trace ID, student ID, conversation ID, source agent, reply text, concept, personalization profile, LLM latency, and history. The history and reply text are the values at the time of the call. The Evaluation telemetry (`evaluation_completed`, `evaluation_failed`, payload fields) is written as before. Only the event order changes: `evaluation_completed` now lands after `reply_sent`.

Evaluation behaviour itself is not changed.

### Cancellation (not redesigned in C1)

Evaluation may still execute after client cancellation, because cancellation does not currently propagate through all upstream and post-response work. On the Concept, Practice, and Assessment paths, the LLM calls, the save, and Evaluation all run to completion regardless of Cancel. On the General path, Cancel stops the upstream stream and nothing is saved. Cancellation is unchanged by C1.

### Hypothesis and metrics (experiment contract)

**Hypothesis:** moving Evaluation off the learner-facing critical path reduces reply completion latency without degrading tutoring quality.

**Primary product metrics**
- First useful content latency: `firstContentMs`.
- Learner-facing reply completion latency: `replyCompletedMs`.

**Secondary**
- Evaluation latency: `evaluationLatencyMs`.
- Total tokens and estimated cost: existing LLM-call payload fields.
- Errors and cancellations: `reply_failed`, `turn_cancelled`, `evaluation_failed`.

**Quality guardrails**
- Existing deterministic evaluation checks (Evaluation Lab section A).
- Routing correctness where applicable (section A/B).
- LLM-as-judge dimensions (section C), with a stochasticity caveat: report several runs per arm and the run-to-run spread.

**Pre/post comparison validity**

| Metric | Pre-C1 records | Post-C1 records | Comparable pre/post? |
|---|---|---|---|
| `wallClockMs` on Concept, Practice, Assessment | includes Evaluation | absent | **No.** Use `replyCompletedMs` for post-C1, and do not compare it directly with the pre-C1 `wallClockMs` |
| `wallClockMs` on General, clarification, decline, fallback | E1 boundary | E1 boundary | Yes, same boundary (no Evaluation on these paths) |
| `replyCompletedMs` | absent | present | Only post-C1 has it. For pre-C1 Concept, Practice, Assessment, the nearest equivalent is `wallClockMs`, which includes Evaluation, so it is **not** a valid pre/post comparison |
| `firstContentMs` | absent | present | **No direct pre/post comparison.** Historical records lack it. The first post-C1 comparison must be against a newly collected pre-C1 baseline, or against a control arm |
| `evaluationLatencyMs` | present | present (after save) | Yes, same measurement. Its timing relative to the reply changed |
| Tokens, estimated cost | present | present | Yes |
| Errors, cancellations | present | present | Yes |

**Net:** no existing latency metric supports a direct before/after comparison for these turns. A valid comparison needs post-change `firstContentMs` and `replyCompletedMs` against a pre-change baseline collected with the same instrumentation, or against an arm where Evaluation is still awaited.

### Verification

- Typecheck, lint, production build: pass.
- Full test suite: 397 of 397 pass.
- Focused timing tests (`web/tests/chat-turn-timing.test.ts`): 9 of 9 pass. They cover streamed first content, empty deltas, non-streamed first content, exclusion of clarification, decline, and fallback, E1 `wallClockMs` compatibility, omission of `wallClockMs` on deferred turns, and ordering of first content before completion.
- Earlier live check (before the semantic fix): one Concept turn, `reply_sent` at 51.46 s, `evaluation_completed` at 53.78 s. The field-level semantics above were not re-verified live.

### Not changed

- Performance RPC and page (no migration). `firstContentMs` and `replyCompletedMs` are telemetry-only in this experiment.
- Benchmark and Evaluation Lab. The golden benchmark has not been rerun.
- Safety, Router, prompts, models, Planning, Reflection, Memory, Evaluation behaviour, `llm/client.ts`.

### Known consequences

- Flight Recorder and transparency panel show no wall-clock for Concept, Practice, and Assessment turns after C1. The transparency panel falls back to the stage sum. Flight Recorder shows a dash.
- The Evaluation stage for those turns may appear after the reply in the trace view.

---

## Implementation: C2 progressive Concept streaming (behind a server-controlled flag)

### Scope and assignment

- Applies to typed-text Concept turns only. Voice, retries, and automatic AI Tutor requests stay on the existing non-streamed path. General streaming is unchanged.
- Arm assignment is server-side: FNV-1a hash of the trace ID, reduced to 0–99, compared with `CONCEPT_STREAMING_TREATMENT_PERCENT` (server environment variable, default `0`, clamped to 0–100). The client cannot toggle it.
- At 0%, every eligible turn is `control`, so the existing `explainConcept` path is used.
- The final validated response remains canonical. Evaluation is scheduled only after the reply is persisted and `done` is sent.

### Experiment state

| Item | State |
|---|---|
| Implementation | Complete (commit `49a4d6d`) |
| Technical verification | Passed (tests, live treatment turn, reconciliation) |
| Production deployment | Live |
| Production allocation | `CONCEPT_STREAMING_TREATMENT_PERCENT=10`: about 10% treatment, about 90% control, for eligible typed Concept turns |
| Experiment conclusion | Pending |

Analysis rules:

- CONTROL and TREATMENT are compared contemporaneously over the same window. Historical single turns are never the control.
- Eligible population: routed Concept, `modality=text`, not a retry, no source (not tutor-auto), ordinary production traffic.
- Primary metric: `firstContentMs`. Secondary: `replyCompletedMs`, `generationMs`, `modelFirstDeltaMs` and `firstExplanationCharMs` (treatment only), and progressive-display head start = `replyCompletedMs - firstContentMs`.
- Guardrails: reconciliation mismatches, streaming failures, validation failures, `shownPartial` failures, cancellations, duplicate assistant messages, persistence failures, Evaluation ordering and missing Evaluation, Safety and routing behaviour, and canonical-response consistency.
- The verified 6,133 ms head start on one turn is not an experiment-level latency improvement. p50 and p90 are not reported as conclusions until sample sizes support them.
- Readout contents: experiment window, control n, treatment n, `firstContentMs` / `replyCompletedMs` / `generationMs` distributions by arm, treatment head-start distribution, guardrail outcomes, confounders and outliers, and whether the evidence supports a conclusion.

### Failure contract

- A failure before any displayed text falls back to the existing Concept path.
- A failure after displayed text (`shownPartial`) ends with a retryable error. Nothing is persisted, and Evaluation is not scheduled.
- Displayed text is reconciled with the canonical formatted reply. A mismatch is a failure.

### Verification

- Unit and wiring tests: extractor (every split point, randomized splits, malformed and duplicate-key input), stream outcomes, arm assignment, Evaluation ordering, persistence-failure ordering, schema and model drift against `llm/client.ts`.
- Live treatment verification: one paid typed-text Concept turn through the real `/api/chat` route on the current working tree, with the treatment share forced to 100% through the server environment for that run only. The configuration was removed afterwards. No other paid turn was run. The golden benchmark was not run.

| Field | Value |
|---|---|
| Trace | `9dcc4fbd-37f0-47cf-a2c4-eb2b887294dc` |
| Arm | `treatment` |
| Modality | `text` |
| firstContentMs | 10,635 |
| firstContentSource | `concept_explanation_char` |
| replyCompletedMs | 16,768 |
| Progressive-display head start | 6,133 ms |
| generationMs | 7,634 |
| modelFirstDeltaMs | 1,529 |
| firstExplanationCharMs | 1,971 |
| displayedChars | 1,015 |
| streamOutcome | `completed` |
| Critical-path residual | 6 ms |

**Reconciliation:** the streamed learner-facing text, the canonical formatted reply, and the persisted assistant message are an exact match (1,015 characters). The rendered page contains the persisted text's head and tail, with no JSON syntax.

**Ordering:** `concept_explained`, then persistence and `reply_sent` (with `firstContentMs` and `replyCompletedMs`), then `evaluation_completed`. Evaluation ran once, after successful persistence.

**Observation scope:** this is one treatment turn. It is not a percentage latency improvement, and it must not be compared causally with historical Concept turns.

**Limitation:** the response body was inspected after request completion. This verification proves server-side first-content availability and correct chunk emission. It does not independently measure browser or network arrival time, or paint time. Those remain unmeasured.

---

## Timing fields version 2 (C3 measurement, measurement only)

Version 2 adds fields next to the existing `criticalPath` object. `criticalPathVersion` stays 1, because that object is unchanged. Turns written before this deploy have none of these fields. The deploy boundary is the first `reply_sent` or terminal event with `timingFieldsVersion: 2`. Analysis of pre-generation timing must restrict to those turns. Do not compare them with older turns.

### Fields and boundaries

| Field | Where | Boundary |
|---|---|---|
| `timingFieldsVersion` | `reply_sent`, `safety_reply_sent`, and terminal events once generation began | `2` |
| `authMs` | same | From before `createClient()` to after `getClaims()` resolves. Outside the E1 clock. Never part of `preGenerationMs`, `replyCompletedMs`, `firstContentMs`, `wallClockMs`, or criticalPath reconciliation. |
| `deployCommit` | same | `VERCEL_GIT_COMMIT_SHA`, or `null` outside Vercel |
| `preGenerationMs` | `reply_sent`, and terminal events once generation began | `turnStartedAt` to the moment the final generation call is started. Recorded immediately before each `timing.measure("generationMs", …)` call. |
| `generationAgent` | same | `Concept`, `Practice`, `Assessment`, or `General`. Concept treatment and control both use `Concept`. |
| `preGenerationTelemetryWriteMs` | same | Sum of awaited telemetry writes that started before the generation boundary |
| `postGenerationTelemetryWriteMs` | `reply_sent` / `safety_reply_sent` only | Sum of awaited telemetry writes that started after the boundary. Not on terminal events, because those writes are not all complete when the terminal event is written. |
| `preGenerationResidualMs` | same as `preGenerationMs` | See the reconciliation rule below |
| `responseDoneMs` | `response_done` event | `turnStartedAt` to immediately before the final `done` event is emitted |
| `postReplyCompletionMs` | `response_done` event | `responseDoneMs − replyCompletedMs`. Includes the awaited `reply_sent` write. |

### Terminal events

Cancelled and failed turns keep their pre-generation timing, so the future baseline is not biased toward turns that reached `reply_sent`. These events carry the terminal fields (`timingFieldsVersion`, `authMs`, `deployCommit`, `preGenerationMs`, `generationAgent`, `preGenerationTelemetryWriteMs`, `preGenerationResidualMs`) only when generation began:

- `turn_cancelled`, pipeline cancel branch
- `turn_cancelled`, aborted exception branch
- `reply_failed` with `assistant_message_save_failed`
- `reply_failed` with `pipeline_exception`
- `concept_explanation_failed`, streamed branch with displayed text (ends the turn)

Not modified: `concept_explanation_failed` on the non-streamed branch. The turn continues to a saved fallback reply, which writes `reply_sent` with the full field set. Failures before generation carry no pre-generation fields.

No new awaited write was added. Only existing payloads gained fields.

### Reconciliation (sequential-span rule)

Under `timingFieldsVersion` 2:

    preGenerationResidualMs = preGenerationMs − (sum of measured pre-generation segment durations) − preGenerationTelemetryWriteMs

This is valid only while pre-generation spans are sequential and non-overlapping, which holds today because every span is awaited in order. If future work introduces overlapping or concurrent spans, this formula must be versioned or redesigned, not reused. Also:

- `preGenerationTelemetryWriteMs + postGenerationTelemetryWriteMs = criticalPath.telemetryWriteMs` on `reply_sent`.

### response_done

`response_done` is written with `after()`, after the stream response finishes. It is not on the learner path and adds no awaited write. Its absence does not prove that the server or client did not emit `done`, because the asynchronous write itself can fail or be dropped.
