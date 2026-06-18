"use client";

import { cn } from "@/lib/ui/cn";

interface NoteFocusModeToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function NoteFocusModeToggle({ active, onToggle }: NoteFocusModeToggleProps) {
  return (
    <button
      type="button"
      className={cn("note-focus-mode-toggle", active && "note-focus-mode-toggle--active")}
      aria-pressed={active}
      aria-label={active ? "Exit focus mode" : "Enter focus mode"}
      title={active ? "Exit focus mode" : "Focus mode"}
      data-testid="note-focus-mode-toggle"
      onClick={onToggle}
    >
      {active ? "Exit focus" : "Focus mode"}
    </button>
  );
}
