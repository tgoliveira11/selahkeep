"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/ui/cn";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "selahkeep:theme";

function readStoredTheme(): ThemePreference {
  try {
    const value = window.localStorage?.getItem?.(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function persistTheme(theme: ThemePreference) {
  try {
    if (theme === "system") {
      window.localStorage?.removeItem?.(STORAGE_KEY);
    } else {
      window.localStorage?.setItem?.(STORAGE_KEY, theme);
    }
  } catch {
    // Ignore storage failures (private mode, stubbed env) — theme still applies.
  }
}

/** Apply a theme preference to the document root (system removes the override). */
function applyTheme(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
}

/**
 * No-UI initializer: applies the persisted theme preference on mount so every
 * page honors the user's choice (default "system" follows the OS).
 */
export function ThemeInit() {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);
  return null;
}

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  {
    value: "system",
    label: "System theme",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "Light theme",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark theme",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    ),
  },
];

/** Segmented System / Light / Dark theme switcher. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  function choose(next: ThemePreference) {
    setThemeState(next);
    persistTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      data-testid="theme-toggle"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[9px] border border-[var(--border)] bg-[var(--card-2)] p-0.5",
        className
      )}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors",
              active
                ? "bg-[var(--card)] text-[var(--primary)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
