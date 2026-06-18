"use client";

import { FormField } from "@/components/ui/form-field";
import { SMART_FILTER_OPTIONS, type SmartLocalFilter } from "@/lib/notes/smart-filters";

interface SmartFilterBarProps {
  value: SmartLocalFilter;
  onChange: (filter: SmartLocalFilter) => void;
}

export function SmartFilterBar({ value, onChange }: SmartFilterBarProps) {
  return (
    <FormField id="smart-filter" label="Filter">
      <select
        id="smart-filter"
        data-testid="smart-filter"
        className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as SmartLocalFilter)}
      >
        {SMART_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
