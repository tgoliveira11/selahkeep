"use client";

import { ToolbarMenu } from "@/components/ui/toolbar-menu";
import { IconSort } from "@/components/ui/toolbar-icons";
import {
  NOTE_SORT_OPTIONS,
  type NoteSortOption,
} from "@/lib/notes/note-sort";

interface SortControlProps {
  value: NoteSortOption;
  onChange: (sort: NoteSortOption) => void;
}

/** Compact sort control inside a toolbar menu. */
export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <ToolbarMenu label="Sort" testId="note-sort-menu" icon={<IconSort />}>
      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Sort by</span>
        <select
          id="note-sort"
          data-testid="note-sort"
          className="w-full min-h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value as NoteSortOption)}
        >
          {NOTE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </ToolbarMenu>
  );
}
