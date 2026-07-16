"use client";

import { useTheme, type ThemePreference } from "@/design-system/hooks/use-theme";
import { SunIcon, MoonIcon, SystemThemeIcon } from "@/design-system/icons";
import styles from "./ThemeToggle.module.css";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light theme", Icon: SunIcon },
  { value: "system", label: "Match system theme", Icon: SystemThemeIcon },
  { value: "dark", label: "Dark theme", Icon: MoonIcon },
];

/** Theme system's user-facing control — light/dark/system, per Sprint 1 scope. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className={styles.toggle} role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          className={`${styles.option} ${preference === value ? styles.optionActive : ""}`}
          onClick={() => setPreference(value)}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
