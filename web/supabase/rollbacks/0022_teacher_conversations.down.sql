revoke execute on function public.insert_teacher_assistant_message(uuid, text) from authenticated;
drop function public.insert_teacher_assistant_message(uuid, text);

drop table public.teacher_messages;
drop table public.teacher_conversations;
