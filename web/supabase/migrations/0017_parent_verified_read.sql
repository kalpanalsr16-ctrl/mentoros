-- Epic H3 (Parent Dashboard) Sprint 1 -- the first policies that give a
-- parent any read access to their child's data at all. Every table this
-- portal needs (profiles, learner_concept_mastery, achievements_earned,
-- revision_schedule) currently has zero parent-read policy, by design --
-- see list-links-for-parent.ts's comment: "verified but H3 doesn't exist
-- yet still means zero extra access." H3 is what changes that, and only
-- for a genuinely verified link (0016_parent_link_verification.sql's
-- state machine is the sole way `status` ever becomes 'verified').
--
-- Same teacher-scoped access pattern as 0012/0013/0014
-- (events/profiles/learner_concept_mastery teacher-read), just swapped
-- from class_students to parent_links -- one row per (parent, student)
-- pair, gated on status = 'verified' instead of class membership.
--
-- Never exposes message/conversation content -- these four tables are
-- mastery scores, achievement records, revision due-dates, and basic
-- profile info, same boundary the teacher-read policies already draw.

create policy "Parents can view profiles of their verified linked children"
  on public.profiles for select
  using (
    id in (
      select parent_links.student_id
      from public.parent_links
      where parent_links.parent_id = auth.uid()
        and parent_links.status = 'verified'
    )
  );

create policy "Parents can read concept mastery for their verified linked children"
  on public.learner_concept_mastery for select
  using (
    student_id in (
      select parent_links.student_id
      from public.parent_links
      where parent_links.parent_id = auth.uid()
        and parent_links.status = 'verified'
    )
  );

create policy "Parents can read achievements for their verified linked children"
  on public.achievements_earned for select
  using (
    student_id in (
      select parent_links.student_id
      from public.parent_links
      where parent_links.parent_id = auth.uid()
        and parent_links.status = 'verified'
    )
  );

create policy "Parents can read revision schedules for their verified linked children"
  on public.revision_schedule for select
  using (
    student_id in (
      select parent_links.student_id
      from public.parent_links
      where parent_links.parent_id = auth.uid()
        and parent_links.status = 'verified'
    )
  );
