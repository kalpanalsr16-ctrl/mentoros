-- Epic H (Parent Verification & Consent, v1) -- extends parent_links
-- (0015) with the full, reviewed-and-approved state machine, plus an
-- explicit, immutable audit log (parent_link_events). Per the approved
-- design:
--
--   * Universal consent model -- no grade/age-gating anywhere in this
--     migration or its functions. Every student approves/rejects
--     identically.
--   * Every state transition happens exclusively through the
--     SECURITY DEFINER functions below. There is NO client-facing
--     UPDATE policy on parent_links, and the original direct-INSERT
--     policy from 0015 is dropped here too -- creation now also goes
--     through a function, so the rate-limit/anti-enumeration logic
--     below can never be bypassed by a client inserting directly.
--     RLS continues to govern visibility only; these functions govern
--     business-rule transitions, each independently re-checking
--     auth.uid() against the correct party rather than trusting RLS
--     to have already done so (SECURITY DEFINER bypasses RLS).
--   * No path back to 'verified' from any terminal state (rejected/
--     expired/revoked) -- a new request always creates a fresh row,
--     never resurrects an old one.
--   * Anti-enumeration: create_link_request() never reveals via its
--     return value whether the target studentId existed, already had
--     an active request, or was newly created -- the calling API route
--     collapses all of those into one generic response. Only a
--     rate-limit condition is distinguishable, and that reveals nothing
--     about any specific id.

alter table public.parent_links
  add column responded_at timestamptz,
  add column responded_by uuid references public.profiles (id),
  add column expires_at timestamptz not null default (now() + interval '14 days'),
  add column revoked_at timestamptz,
  add column revoked_by uuid references public.profiles (id);

alter table public.parent_links drop constraint parent_links_status_check;
alter table public.parent_links add constraint parent_links_status_check
  check (status in ('pending', 'verified', 'rejected', 'expired', 'revoked'));

-- Replaces 0015's full-pair unique constraint: a new request after a
-- prior one was rejected/expired/revoked must be allowed (a fresh
-- relationship record, per the approved design). Only one ACTIVE
-- (pending or verified) row per pair may exist at a time.
alter table public.parent_links drop constraint parent_links_parent_id_student_id_key;
create unique index parent_links_active_pair_idx
  on public.parent_links (parent_id, student_id)
  where status in ('pending', 'verified');

drop policy if exists "Parents can create their own link requests as pending" on public.parent_links;

-- ============================================================
-- parent_link_events -- immutable audit log. Written exclusively by
-- the functions below (never directly by a client) -- no INSERT policy
-- exists for authenticated users, and no UPDATE/DELETE policy exists at
-- all. Append-only, matching this codebase's existing `events` table
-- philosophy (an immutable log alongside a mutable current-state row).
-- ============================================================
create table public.parent_link_events (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.parent_links (id) on delete cascade,
  action text not null check (action in ('requested', 'approved', 'rejected', 'revoked')),
  actor_id uuid not null references public.profiles (id),
  parent_id uuid not null references public.profiles (id),
  student_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index parent_link_events_link_id_idx on public.parent_link_events (link_id);
create index parent_link_events_parent_id_idx on public.parent_link_events (parent_id);
create index parent_link_events_student_id_idx on public.parent_link_events (student_id);

alter table public.parent_link_events enable row level security;

create policy "Parents can view their own link event history"
  on public.parent_link_events for select
  using (parent_id = auth.uid());

create policy "Students can view their own link event history"
  on public.parent_link_events for select
  using (student_id = auth.uid());

-- ============================================================
-- parent_link_request_attempts -- rate-limit counter, deliberately
-- separate from parent_links itself. A nonexistent-target attempt never
-- creates a parent_links row at all (the FK simply fails), so counting
-- parent_links rows alone would let pure id-enumeration run completely
-- unthrottled -- exactly the attack this table exists to stop. No RLS
-- policy is defined at all (locked down entirely); only
-- create_link_request() below ever touches it.
-- ============================================================
create table public.parent_link_request_attempts (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index parent_link_request_attempts_parent_id_idx on public.parent_link_request_attempts (parent_id);

alter table public.parent_link_request_attempts enable row level security;

-- ============================================================
-- create_link_request -- H2's creation path, now rate-limited and
-- exception-uniform (the calling application code collapses every
-- outcome below into the same generic response; only the
-- 'rate_limited' condition is ever distinguished).
--
-- The inner exception handler is NOT a convenience -- it's what makes
-- the rate limit actually work against enumeration. A raised exception
-- that propagates all the way out of this function rolls back the
-- ENTIRE call, including the attempt-log insert that happened moments
-- earlier in the same transaction. Swallowing the inner error (rather
-- than re-raising it) lets the function return normally, so the
-- transaction commits and the attempt genuinely counts toward the
-- limit -- whether or not it produced a real parent_links row.
-- ============================================================
create or replace function public.create_link_request(p_student_id uuid)
returns public.parent_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid := auth.uid();
  v_recent_count int;
  v_link public.parent_links;
begin
  if v_parent_id is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into v_recent_count
    from public.parent_link_request_attempts
    where parent_id = v_parent_id and created_at > now() - interval '24 hours';

  if v_recent_count >= 10 then
    raise exception 'rate_limited';
  end if;

  insert into public.parent_link_request_attempts (parent_id) values (v_parent_id);

  begin
    insert into public.parent_links (parent_id, student_id, status)
      values (v_parent_id, p_student_id, 'pending')
      returning * into v_link;

    insert into public.parent_link_events (link_id, action, actor_id, parent_id, student_id)
      values (v_link.id, 'requested', v_parent_id, v_link.parent_id, v_link.student_id);
  exception when others then
    -- Deliberately swallowed: a nonexistent student id, an already-
    -- active request for this pair, etc. must never surface as a
    -- distinguishable error (anti-enumeration) -- v_link simply stays
    -- null, and the function still completes successfully.
    v_link := null;
  end;

  return v_link;
end;
$$;

revoke all on function public.create_link_request(uuid) from public;
grant execute on function public.create_link_request(uuid) to authenticated;

-- ============================================================
-- respond_to_link_request -- the student's approve/reject action.
-- ============================================================
create or replace function public.respond_to_link_request(p_link_id uuid, p_decision text)
returns public.parent_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.parent_links;
begin
  if p_decision not in ('verified', 'rejected') then
    raise exception 'invalid decision: %', p_decision;
  end if;

  select * into v_link from public.parent_links where id = p_link_id for update;

  if v_link is null then
    raise exception 'link request not found';
  end if;
  if v_link.student_id <> auth.uid() then
    raise exception 'not authorized to respond to this request';
  end if;
  if v_link.status <> 'pending' then
    raise exception 'this request is no longer pending';
  end if;
  if v_link.expires_at < now() then
    raise exception 'this request has expired';
  end if;

  update public.parent_links
    set status = p_decision, responded_at = now(), responded_by = auth.uid()
    where id = p_link_id
    returning * into v_link;

  insert into public.parent_link_events (link_id, action, actor_id, parent_id, student_id)
    values (v_link.id, case when p_decision = 'verified' then 'approved' else 'rejected' end, auth.uid(), v_link.parent_id, v_link.student_id);

  return v_link;
end;
$$;

revoke all on function public.respond_to_link_request(uuid, text) from public;
grant execute on function public.respond_to_link_request(uuid, text) to authenticated;

-- ============================================================
-- revoke_parent_link -- either party can end a verified link.
-- ============================================================
create or replace function public.revoke_parent_link(p_link_id uuid)
returns public.parent_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.parent_links;
begin
  select * into v_link from public.parent_links where id = p_link_id for update;

  if v_link is null then
    raise exception 'link not found';
  end if;
  if auth.uid() <> v_link.parent_id and auth.uid() <> v_link.student_id then
    raise exception 'not authorized to revoke this link';
  end if;
  if v_link.status <> 'verified' then
    raise exception 'only a verified link can be revoked';
  end if;

  update public.parent_links
    set status = 'revoked', revoked_at = now(), revoked_by = auth.uid()
    where id = p_link_id
    returning * into v_link;

  insert into public.parent_link_events (link_id, action, actor_id, parent_id, student_id)
    values (v_link.id, 'revoked', auth.uid(), v_link.parent_id, v_link.student_id);

  return v_link;
end;
$$;

revoke all on function public.revoke_parent_link(uuid) from public;
grant execute on function public.revoke_parent_link(uuid) to authenticated;

-- ============================================================
-- A student needs to see *who* is asking before meaningfully consenting
-- -- this is one-directional only. The parent does NOT get a matching
-- policy to read the student's profile while pending; that would
-- undermine the "pending grants zero access" guarantee already tested
-- in H1. A student can see a requesting parent's basic profile row
-- (display_name, same column set 0013's teacher-scoped policy already
-- exposes in the other direction) once any parent_links row references
-- them, regardless of status -- seeing who *has* linked (including past
-- rejected/revoked requests) is not a privacy concern the way the
-- reverse direction is.
-- ============================================================
create policy "Students can view basic profile info of parents who have linked to them"
  on public.profiles for select
  using (
    id in (
      select parent_id from public.parent_links where student_id = auth.uid()
    )
  );
