"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/design-system/primitives/Button";
import styles from "./page.module.css";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setStatus("idle");

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      // Supabase returns a session immediately when email confirmation is
      // disabled for the project. Confirmed during M1-07 that this
      // project currently has confirmation ON, so this branch is a
      // fallback for that setting being turned off, not the default path.
      router.push("/chat");
      router.refresh();
      return;
    }

    // Email confirmation is required before a session exists.
    setConfirmationSent(true);
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Create your account</h1>

        {confirmationSent ? (
          <p className={styles.message}>
            Check your email for a confirmation link, then <Link href="/sign-in">sign in</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
            </label>
            {error && <p className={styles.errorBanner}>{error}</p>}
            <Button type="submit" loading={status === "submitting"}>
              Sign up
            </Button>
          </form>
        )}

        <p className={styles.footer}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
