import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RosterMutationResult = { ok: true } | { ok: false; error: string };

/**
 * Teacher-managed roster only (explicit product decision for this
 * sprint -- no self-enrollment/join-code flow; see the note in
 * get-teacher-classes.ts and 0014_learner_concept_mastery_teacher_read.sql).
 * A teacher adds a student by their exact account id -- the only
 * identifier the current schema exposes to a client query (`profiles`
 * has no email/username column; `auth.users` isn't queryable from here).
 * RLS (0011_classes.sql) is the actual authorization backstop on both
 * paths; the `role` check below is input validation at a system boundary
 * (a teacher could otherwise paste any account's id), not a substitute
 * for it.
 */
export async function addStudentToClass(
  supabase: SupabaseServerClient,
  classId: string,
  studentId: string,
): Promise<RosterMutationResult> {
  // Insert first, then validate role -- a role pre-check on the teacher's
  // own RLS-scoped client can't work here: profiles' teacher-read policy
  // (0013_profiles_teacher_read.sql) only grants visibility into students
  // already linked via class_students, which is exactly the row this
  // function is about to create. Checking after insert lets RLS make that
  // row visible first; a bad id still fails cleanly on the FK constraint.
  const { error: insertError } = await supabase.from("class_students").insert({ class_id: classId, student_id: studentId });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, error: "That student is already in this class." };
    }
    if (insertError.code === "23503") {
      return { ok: false, error: "No account found with that ID." };
    }
    return { ok: false, error: "Couldn't add that student. Check the class and student IDs." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", studentId).maybeSingle();

  if (!profile || profile.role !== "student") {
    await supabase.from("class_students").delete().eq("class_id", classId).eq("student_id", studentId);
    return { ok: false, error: "That account isn't a student account." };
  }

  return { ok: true };
}

export async function removeStudentFromClass(
  supabase: SupabaseServerClient,
  classId: string,
  studentId: string,
): Promise<RosterMutationResult> {
  const { error } = await supabase.from("class_students").delete().eq("class_id", classId).eq("student_id", studentId);

  if (error) {
    return { ok: false, error: "Couldn't remove that student." };
  }

  return { ok: true };
}
