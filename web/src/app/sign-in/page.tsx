"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setStatus("idle");
      setError(signInError.message);
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Sign in</h1>

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
            {status === "submitting" ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={styles.footer}>
          Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
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
  footer: { marginTop: "1.5rem", fontSize: "0.875rem", opacity: 0.8 },
};
