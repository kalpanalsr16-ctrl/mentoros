revoke execute on function public.insert_assistant_message(uuid, text, uuid) from authenticated;
drop function public.insert_assistant_message(uuid, text, uuid);

drop policy "Students can add their own messages to their own conversations" on public.messages;

create policy "Students can add messages to their own conversations"
  on public.messages for insert
  with check (
    conversation_id in (
      select id from public.conversations where student_id = auth.uid()
    )
  );
