export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 600 }}>MentorOS</h1>
      <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
        Coming soon.
      </p>
    </main>
  );
}
