"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      // Email confirmation is off for this project — already signed in.
      router.push("/chat");
      router.refresh();
      return;
    }

    // Email confirmation is required before a session exists.
    setConfirmationSent(true);
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Create your account</h1>

        {confirmationSent ? (
          <p style={styles.message}>
            Check your email for a confirmation link, then{" "}
            <Link href="/sign-in">sign in</Link>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            </label>
            {error && <p style={styles.error}>{error}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              style={styles.button}
            >
              {status === "submitting" ? "Creating account..." : "Sign up"}
            </button>
          </form>
        )}

        <p style={styles.footer}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  card: { width: "100%", maxWidth: 360 },
  heading: { fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { display: "flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.9rem" },
  input: {
    padding: "0.5rem 0.75rem",
    borderRadius: 6,
    border: "1px solid #999",
    fontSize: "1rem",
  },
  button: {
    padding: "0.625rem",
    borderRadius: 6,
    border: "none",
    background: "#171717",
    color: "#fff",
    fontSize: "1rem",
    cursor: "pointer",
  },
  error: { color: "#b3261e", fontSize: "0.875rem", margin: 0 },
  message: { fontSize: "0.95rem", lineHeight: 1.5 },
  footer: { marginTop: "1.5rem", fontSize: "0.875rem", opacity: 0.8 },
};
