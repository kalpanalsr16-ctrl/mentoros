"use client";

import { useState, type FormEvent } from "react";

export function MessageInput({
  onSend,
}: {
  onSend: (content: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "0.5rem",
        padding: "1rem",
        borderTop: "1px solid #ddd",
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask a question..."
        style={{
          flex: 1,
          minWidth: 0,
          padding: "0.625rem 0.875rem",
          borderRadius: 8,
          border: "1px solid #999",
          fontSize: "1rem",
        }}
      />
      <button
        type="submit"
        style={{
          padding: "0.625rem 1.25rem",
          borderRadius: 8,
          border: "none",
          background: "#171717",
          color: "#fff",
          fontSize: "1rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Send
      </button>
    </form>
  );
}
