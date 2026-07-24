-- Epic G2 (Teacher Studio Dashboard) -- same teacher-scoped access pattern
-- as 0012_events_teacher_read.sql, applied to `profiles` this time: the
-- activity feed needs a student's display_name, which today only the
-- student themselves can read (0001_init.sql's "Students can view their
-- own profile" policy). Scoped identically via class_students, so a
-- teacher only ever sees profiles for students actually in their own
-- classes.

create policy "Teachers can view profiles of students in their own classes"
  on public.profiles for select
  using (
    id in (
      select class_students.student_id
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where classes.teacher_id = auth.uid()
    )
  );
