-- Epic G14 (AI Lesson Assistant) -- docs/ui-architecture/03_Teacher_Studio.md's
-- own framing: "a teacher's authoring conversation is a different data
-- domain entirely" from the student conversations/messages tables,
-- which are RLS-scoped to student ownership and safety-gated for a
-- child audience. Resolves that doc's open "separate tables vs. a
-- context discriminator column" question in favor of separate tables --
-- matching this schema's existing precedent (assessments_authored vs.
-- runtime assessment data) and giving a hard structural guarantee
-- (not just an RLS policy) that this feature can never read or write
-- student conversation data.
--
-- Deliberately minimal, mirroring 0001_init.sql's own conversations/
-- messages shape: no status/subject columns (teacher authoring here is
-- a single ongoing conversation per teacher, no multi-conversation
-- management in this pass, per the approved design proposal).

create table public.teacher_conversations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index teacher_conversations_teacher_id_idx on public.teacher_conversations (teacher_id);

alter table public.teacher_conversations enable row level security;

create policy "Teachers can view their own assistant conversations"
  on public.teacher_conversations for select
  using (teacher_id = auth.uid());

create policy "Teachers can create their own assistant conversations"
  on public.teacher_conversations for insert
  with check (teacher_id = auth.uid());

create table public.teacher_messages (
  id uuid primary key default gen_random_uuid(),
  teacher_conversation_id uuid not null references public.teacher_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index teacher_messages_conversation_id_idx on public.teacher_messages (teacher_conversation_id, created_at);

alter table public.teacher_messages enable row level security;

create policy "Teachers can view messages in their own assistant conversations"
  on public.teacher_messages for select
  using (
    teacher_conversation_id in (
      select id from public.teacher_conversations where teacher_id = auth.uid()
    )
  );

-- Students never have any policy on either table above -- there is no
-- shared code path, table, or column with public.conversations/messages
-- for a teacher-vs-student access mistake to even be possible here,
-- unlike a discriminator-column design would require.

-- Assistant-role inserts go through a SECURITY DEFINER RPC, same
-- reasoning as 0021_messages_role_rls.sql: a plain insert policy can't
-- distinguish "the server saving the real assistant reply" from "a
-- teacher forging one" since both present the same JWT.
create policy "Teachers can add their own messages to their own assistant conversations"
  on public.teacher_messages for insert
  with check (
    role = 'user'
    and teacher_conversation_id in (
      select id from public.teacher_conversations where teacher_id = auth.uid()
    )
  );

create function public.insert_teacher_assistant_message(
  p_teacher_conversation_id uuid,
  p_content text
)
returns public.teacher_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.teacher_messages;
begin
  if not exists (
    select 1 from public.teacher_conversations
    where id = p_teacher_conversation_id and teacher_id = auth.uid()
  ) then
    raise exception 'conversation not found or not owned by caller';
  end if;

  insert into public.teacher_messages (teacher_conversation_id, role, content)
  values (p_teacher_conversation_id, 'assistant', p_content)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.insert_teacher_assistant_message(uuid, text) to authenticated;
