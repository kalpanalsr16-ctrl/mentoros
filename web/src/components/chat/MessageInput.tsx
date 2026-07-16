"use client";

import { useState, type FormEvent } from "react";
import { CancelIcon } from "@/design-system/icons";

export function MessageInput({
  onSend,
  onCancel,
  disabled = false,
}: {
  onSend: (content: string) => void;
  /** Sprint 4: present while a reply is generating -- lets the student stop it instead of only waiting. */
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
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
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "0.625rem 0.875rem",
          borderRadius: 8,
          border: "1px solid #999",
          fontSize: "1rem",
        }}
      />
      {disabled && onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.625rem 1.25rem",
            borderRadius: 8,
            border: "1px solid #999",
            background: "#fff",
            color: "#171717",
            fontSize: "1rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <CancelIcon size={14} aria-hidden="true" />
          Cancel
        </button>
      ) : (
        <button
          type="submit"
          disabled={disabled}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: 8,
            border: "none",
            background: "#171717",
            color: "#fff",
            fontSize: "1rem",
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {disabled ? "Sending..." : "Send"}
        </button>
      )}
    </form>
  );
}
