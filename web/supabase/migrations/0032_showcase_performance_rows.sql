-- Per-event performance measurements for the authorized showcase account
-- (docs/PHASE_E_ARCHITECTURE_PERFORMANCE.md, E3).
--
-- events is self-read only, so a showcase account cannot read other students'
-- rows directly. This function returns numeric measurements only: no student
-- identifiers, no payload text, no prompts, no reply content. Each row carries
-- a traffic class computed here, so the page can keep benchmark and tutor-auto
-- traffic apart from ordinary turns.
--
-- Traffic classes:
--   benchmark   the trace belongs to a golden-set eval run (eval_run_items)
--   tutor_auto  the turn was an AI Tutor automatic request (reply_sent source)
--   other       everything else: students, the demo account, and any tests.
--               These cannot be told apart from each other.

create function public.showcase_performance_rows()
returns table (
  trace_id text,
  event_name text,
  created_at timestamptz,
  traffic text,
  model text,
  latency_ms numeric,
  input_tokens integer,
  output_tokens integer,
  stored_cost_usd numeric,
  wall_clock_ms numeric,
  modality text,
  voice_question_to_transcript_ms numeric,
  voice_transcript_to_reply_ms numeric,
  voice_reply_to_audio_ms numeric,
  voice_total_ms numeric,
  avatar_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.ai_showcase_access
  ) then
    raise exception 'showcase access required';
  end if;

  return query
  select
    e.trace_id::text,
    e.event_name,
    e.created_at,
    case
      when exists (select 1 from public.eval_run_items i where i.trace_id = e.trace_id) then 'benchmark'
      when exists (
        select 1 from public.events r
        where r.trace_id = e.trace_id
          and r.event_name in ('reply_sent', 'safety_reply_sent')
          and r.payload->>'source' = 'tutor_auto'
      ) then 'tutor_auto'
      else 'other'
    end as traffic,
    e.payload->>'model' as model,
    coalesce(e.payload->>'latencyMs', e.payload->>'evaluationLatencyMs')::numeric as latency_ms,
    coalesce(e.payload->>'inputTokens', e.payload->>'evaluationInputTokens')::integer as input_tokens,
    coalesce(e.payload->>'outputTokens', e.payload->>'evaluationOutputTokens')::integer as output_tokens,
    coalesce(e.payload->>'estimatedCostUsd', e.payload->>'evaluationCostUsd')::numeric as stored_cost_usd,
    (e.payload->>'wallClockMs')::numeric as wall_clock_ms,
    e.payload->>'modality' as modality,
    (e.payload->>'questionEndToTranscriptMs')::numeric as voice_question_to_transcript_ms,
    (e.payload->>'transcriptToReplyMs')::numeric as voice_transcript_to_reply_ms,
    (e.payload->>'replyStartToAvatarAudioMs')::numeric as voice_reply_to_audio_ms,
    (e.payload->>'totalMs')::numeric as voice_total_ms,
    e.payload->>'avatarStatus' as avatar_status
  from public.events e
  where e.event_name in (
    'message_received', 'safety_blocked', 'intent_detected', 'learning_plan_created', 'planning_failed',
    'concept_explained', 'practice_generated', 'assessment_completed', 'reflection_completed',
    'evaluation_completed', 'evaluation_failed', 'llm_call_succeeded', 'llm_call_failed',
    'voice_transcription_completed', 'voice_transcription_failed', 'voice_turn_timing',
    'reply_sent', 'safety_reply_sent', 'reply_failed', 'turn_cancelled'
  );
end;
$$;

revoke execute on function public.showcase_performance_rows() from public, anon;
grant execute on function public.showcase_performance_rows() to authenticated;
