-- Rollback for 0016_parent_link_verification.sql.

drop policy if exists "Students can view basic profile info of parents who have linked to them" on public.profiles;

drop function if exists public.revoke_parent_link(uuid);
drop function if exists public.respond_to_link_request(uuid, text);
drop function if exists public.create_link_request(uuid);

drop table if exists public.parent_link_request_attempts;
drop table if exists public.parent_link_events;

drop index if exists public.parent_links_active_pair_idx;
alter table public.parent_links add constraint parent_links_parent_id_student_id_key unique (parent_id, student_id);

alter table public.parent_links drop constraint parent_links_status_check;
alter table public.parent_links add constraint parent_links_status_check
  check (status in ('pending', 'verified', 'revoked'));

alter table public.parent_links
  drop column responded_at,
  drop column responded_by,
  drop column expires_at,
  drop column revoked_at,
  drop column revoked_by;

create policy "Parents can create their own link requests as pending"
  on public.parent_links for insert
  with check (parent_id = auth.uid() and status = 'pending');
