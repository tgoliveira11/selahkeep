"use client";

import { Button } from "@/components/ui/button";
import type { NoteViewMode } from "@/lib/notes/note-view-mode";
import { cn } from "@/lib/ui/cn";

interface ViewModeToggleProps {
  mode: NoteViewMode;
  onChange: (mode: NoteViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex gap-1 rounded-[var(--radius)] border border-[var(--border)] p-1" role="group" aria-label="View mode">
      <Button
        type="button"
        variant={mode === "cards" ? "primary" : "secondary"}
        className={cn("min-h-9 px-3 py-1.5")}
        data-testid="view-mode-cards"
        onClick={() => onChange("cards")}
      >
        Cards
      </Button>
      <Button
        type="button"
        variant={mode === "list" ? "primary" : "secondary"}
        className={cn("min-h-9 px-3 py-1.5")}
        data-testid="view-mode-list"
        onClick={() => onChange("list")}
      >
        List
      </Button>
    </div>
  );
}
