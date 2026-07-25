"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/design-system/primitives/Button";
import { CancelIcon } from "@/design-system/icons";
import styles from "./MessageInput.module.css";

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
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask a question..."
        disabled={disabled}
        className={styles.input}
      />
      {disabled && onCancel ? (
        <Button type="button" variant="secondary" onClick={onCancel} className={styles.button}>
          <CancelIcon size={14} aria-hidden="true" />
          Cancel
        </Button>
      ) : (
        <Button type="submit" disabled={disabled} loading={disabled} className={styles.button}>
          Send
        </Button>
      )}
    </form>
  );
}
