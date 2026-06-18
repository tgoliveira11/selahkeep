"use client";

import {
  SMART_FILTER_OPTIONS,
  type SmartLocalFilter,
} from "@/lib/notes/smart-filters";
import { cn } from "@/lib/ui/cn";

/** Primary smart filters shown as quick chips on `/notes`. */
export const PRIMARY_SMART_FILTER_CHIPS: SmartLocalFilter[] = [
  "all-active",
  "pinned",
  "favorites",
  "unresolved",
  "resolved",
  "archived",
  "trash",
];

const chipLabels = new Map(SMART_FILTER_OPTIONS.map((option) => [option.value, option.label]));

interface SmartFilterChipsProps {
  value: SmartLocalFilter;
  onChange: (filter: SmartLocalFilter) => void;
  filters?: SmartLocalFilter[];
}

export function SmartFilterChips({
  value,
  onChange,
  filters = PRIMARY_SMART_FILTER_CHIPS,
}: SmartFilterChipsProps) {
  return (
    <div
      className="smart-filter-chips flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5"
      data-testid="smart-filter-chips"
      role="tablist"
      aria-label="Smart filters"
    >
      {filters.map((filter) => {
        const selected = value === filter;
        const label = chipLabels.get(filter) ?? filter;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`smart-filter-chip-${filter}`}
            className={cn(
              "smart-filter-chips__chip inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
              selected
                ? "smart-filter-chips__chip--active border-[var(--primary)] bg-[var(--accent-muted)] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]/40"
            )}
            onClick={() => onChange(filter)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
