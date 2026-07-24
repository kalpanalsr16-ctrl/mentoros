"use client";

import styles from "./ChipSelect.module.css";

export type ChipOption = { value: string; label: string };

export type ChipSelectProps = {
  options: ChipOption[];
  /** Always an array -- single-select just never lets it exceed length 1. */
  value: string[];
  onChange: (value: string[]) => void;
  multi?: boolean;
  "aria-label": string;
};

/**
 * Single-tap chip selection (docs/design-system/04-UX-Design-Experiences.md
 * §11.2's onboarding wireframe: "chip-based single-tap selection wherever
 * possible -- minimizes typing for young learners"). One primitive for
 * both single-select (Grade, Learning preference) and multi-select
 * (Goals) -- `multi` changes only whether a second tap adds to the
 * selection or replaces it.
 */
export function ChipSelect({ options, value, onChange, multi = false, ...rest }: ChipSelectProps) {
  function toggle(optionValue: string) {
    if (multi) {
      onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]);
    } else {
      onChange([optionValue]);
    }
  }

  return (
    <div className={styles.group} role="group" aria-label={rest["aria-label"]}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.chip} ${selected ? styles.selected : ""}`}
            aria-pressed={selected}
            onClick={() => toggle(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
