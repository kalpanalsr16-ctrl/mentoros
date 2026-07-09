-- MentorOS M0 core schema.
-- Tables: profiles, conversations, messages, events.
-- See 06_Technical_Architecture.md and the M0 schema review for design rationale.

create extension if not exists pgcrypto;

-- ============================================================
-- profiles
-- One row per student, extending Supabase's built-in auth.users.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  grade smallint,
  display_name text,
  preferred_language text not null default 'en',
  timezone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Students can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Students can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Auto-create a profile row the instant a new auth user signs up.
-- security definer + fixed search_path is the standard safe pattern for
-- a trigger function that needs to write to a table the caller (anon
-- role, during sign-up) has no direct INSERT policy for.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- conversations
-- One row per chat session.
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default 'mathematics',
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned', 'archived')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index conversations_student_started_idx
  on public.conversations (student_id, started_at desc);

alter table public.conversations enable row level security;

create policy "Students can view their own conversations"
  on public.conversations for select
  using (student_id = auth.uid());

create policy "Students can create their own conversations"
  on public.conversations for insert
  with check (student_id = auth.uid());

create policy "Students can update their own conversations"
  on public.conversations for update
  using (student_id = auth.uid());

-- ============================================================
-- messages
-- One row per message, either side of the conversation.
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "Students can view messages in their own conversations"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations where student_id = auth.uid()
    )
  );

create policy "Students can add messages to their own conversations"
  on public.messages for insert
  with check (
    conversation_id in (
      select id from public.conversations where student_id = auth.uid()
    )
  );

-- ============================================================
-- events
-- The observability log. Every request/response gets a row here,
-- tied together by trace_id (wired up in Task 7).
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null,
  conversation_id uuid references public.conversations (id) on delete set null,
  student_id uuid references public.profiles (id) on delete set null,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_trace_id_idx on public.events (trace_id);
create index events_conversation_id_idx on public.events (conversation_id);
create index events_student_id_idx on public.events (student_id);
create index events_created_at_idx on public.events (created_at);

alter table public.events enable row level security;

-- Intentionally no SELECT policy: events is an internal audit log,
-- readable via the Supabase dashboard (which bypasses RLS), not via
-- the app's client-facing API.
create policy "Students can log their own events"
  on public.events for insert
  with check (student_id = auth.uid());
