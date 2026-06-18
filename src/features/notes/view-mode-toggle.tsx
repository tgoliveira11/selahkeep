"use client";

import { IconCards, IconList } from "@/components/ui/toolbar-icons";
import type { NoteViewMode } from "@/lib/notes/note-view-mode";
import { cn } from "@/lib/ui/cn";

interface ViewModeToggleProps {
  mode: NoteViewMode;
  onChange: (mode: NoteViewMode) => void;
}

/** Compact segmented icon toggle — matches shared toolbar control height. */
export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="view-mode-toggle" role="group" aria-label="View mode">
      <button
        type="button"
        className={cn(
          "view-mode-toggle__btn",
          mode === "cards" && "view-mode-toggle__btn--active"
        )}
        data-testid="view-mode-cards"
        aria-label="Cards view"
        aria-pressed={mode === "cards"}
        onClick={() => onChange("cards")}
      >
        <IconCards />
      </button>
      <button
        type="button"
        className={cn(
          "view-mode-toggle__btn",
          mode === "list" && "view-mode-toggle__btn--active"
        )}
        data-testid="view-mode-list"
        aria-label="List view"
        aria-pressed={mode === "list"}
        onClick={() => onChange("list")}
      >
        <IconList />
      </button>
    </div>
  );
}
