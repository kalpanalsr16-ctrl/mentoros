-- Epic B3 (Repository Hardening) -- 13_Implementation_Sequence.md's
-- documented gap: the original INSERT policy on `messages`
-- (0001_init.sql) checks only conversation ownership, not `role` --
-- an authenticated student can currently insert a row with
-- role: 'assistant' into their own conversation, forging an AI reply.
--
-- The doc's literal acceptance criteria (`role != 'assistant' OR
-- auth.role() = 'service_role'`) assumed assistant-message inserts run
-- under a service-role client. They don't -- api/chat/route.ts inserts
-- the assistant's reply using the student's own session client, so
-- that policy would reject every real assistant turn the moment it
-- shipped. Resolved (per explicit product-owner decision) with a
-- SECURITY DEFINER RPC instead: the table's own INSERT policy becomes
-- students-only (role = 'user'), and the one legitimate path for an
-- assistant row is this function, which re-checks conversation
-- ownership itself since it bypasses RLS.
drop policy "Students can add messages to their own conversations" on public.messages;

create policy "Students can add their own messages to their own conversations"
  on public.messages for insert
  with check (
    role = 'user'
    and conversation_id in (
      select id from public.conversations where student_id = auth.uid()
    )
  );

create function public.insert_assistant_message(
  p_conversation_id uuid,
  p_content text,
  p_trace_id uuid
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.messages;
begin
  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and student_id = auth.uid()
  ) then
    raise exception 'conversation not found or not owned by caller';
  end if;

  insert into public.messages (conversation_id, role, content, trace_id)
  values (p_conversation_id, 'assistant', p_content, p_trace_id)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.insert_assistant_message(uuid, text, uuid) to authenticated;
