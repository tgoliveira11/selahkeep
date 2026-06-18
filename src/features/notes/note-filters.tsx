"use client";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { RESOLVED_COPY } from "@/lib/notes/resolved-labels";
import type { ResolvedFilter } from "@/lib/crypto-client/note-search";
import type { VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";
import type { SmartLocalFilter } from "@/lib/notes/smart-filters";
import { cn } from "@/lib/ui/cn";

export type NoteFilterState = {
  search: string;
  categoryId: string | "all" | "none";
  tagId: string | "all";
  resolved: ResolvedFilter;
};

export const defaultNoteFilters: NoteFilterState = {
  search: "",
  categoryId: "all",
  tagId: "all",
  resolved: "all",
};

interface NoteFiltersProps {
  filters: NoteFilterState;
  categories: VaultCategory[];
  tags: VaultTag[];
  onChange: (filters: NoteFilterState) => void;
  /** When true, renders inside `NotesListControls` without an outer card. */
  embedded?: boolean;
}

export function hasNoteOrganizers(categories: VaultCategory[], tags: VaultTag[]): boolean {
  return categories.length > 0 || tags.length > 0;
}

/** Whether advanced filter fields beyond status/quick filters exist. */
export function hasAdvancedFilterFields(categories: VaultCategory[], tags: VaultTag[]): boolean {
  return categories.length > 0 || tags.length > 0;
}

const OPTIONAL_SMART_FILTERS: { value: SmartLocalFilter; label: string }[] = [
  { value: "no-category", label: "No category" },
  { value: "no-tags", label: "No tags" },
  { value: "checklist", label: "Checklist notes" },
];

interface AdvancedNoteFiltersProps {
  filters: NoteFilterState;
  categories: VaultCategory[];
  tags: VaultTag[];
  smartFilter: SmartLocalFilter;
  onChange: (filters: NoteFilterState) => void;
  onSmartFilterChange: (filter: SmartLocalFilter) => void;
}

/** Category, tag, status, and optional smart filters for the Filters menu. */
export function AdvancedNoteFilters({
  filters,
  categories,
  tags,
  smartFilter,
  onChange,
  onSmartFilterChange,
}: AdvancedNoteFiltersProps) {
  const showCategory = categories.length > 0;
  const showTag = tags.length > 0;

  return (
    <div className="space-y-3" data-testid="advanced-note-filters">
      {showCategory && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">Category</span>
          <select
            id="filter-category"
            data-testid="filter-category"
            className="w-full min-h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={filters.categoryId}
            onChange={(e) =>
              onChange({
                ...filters,
                categoryId: e.target.value as NoteFilterState["categoryId"],
              })
            }
          >
            <option value="all">All categories</option>
            <option value="none">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {showTag && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--muted)]">Tag</span>
          <select
            id="filter-tag"
            data-testid="filter-tag"
            className="w-full min-h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={filters.tagId}
            onChange={(e) => onChange({ ...filters, tagId: e.target.value })}
          >
            <option value="all">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted)]">{RESOLVED_COPY.filterLabel}</span>
        <select
          id="filter-resolved"
          data-testid="filter-resolved"
          className="w-full min-h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          value={filters.resolved}
          onChange={(e) =>
            onChange({ ...filters, resolved: e.target.value as ResolvedFilter })
          }
        >
          <option value="all">All notes</option>
          <option value="resolved">{RESOLVED_COPY.showResolved}</option>
          <option value="unresolved">{RESOLVED_COPY.showUnresolved}</option>
        </select>
      </label>

      <div className="space-y-1.5 border-t border-[var(--border)] pt-3">
        <p className="text-xs font-medium text-[var(--muted)]">Quick filters</p>
        <div className="flex flex-wrap gap-1.5">
          {OPTIONAL_SMART_FILTERS.map((option) => {
            const selected = smartFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                data-testid={`advanced-smart-filter-${option.value}`}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  selected
                    ? "border-[var(--primary)] bg-[var(--accent-muted)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                )}
                onClick={() => onSmartFilterChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function NoteFilters({
  filters,
  categories,
  tags,
  onChange,
  embedded = false,
}: NoteFiltersProps) {
  if (!hasNoteOrganizers(categories, tags)) {
    return null;
  }

  return (
    <div
      className={
        embedded
          ? "note-filters note-filters--embedded space-y-4 border-t border-[var(--border)] pt-4"
          : "note-filters mb-6 space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]"
      }
      data-testid={embedded ? "note-filters-embedded" : "note-filters"}
    >
      <FormField id="note-search" label="Search">
        <Input
          id="note-search"
          type="search"
          placeholder="Search titles, categories, tags…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="filter-category-legacy" label="Category">
          <select
            id="filter-category-legacy"
            className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={filters.categoryId}
            onChange={(e) =>
              onChange({
                ...filters,
                categoryId: e.target.value as NoteFilterState["categoryId"],
              })
            }
          >
            <option value="all">All categories</option>
            <option value="none">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="filter-tag-legacy" label="Tag">
          <select
            id="filter-tag-legacy"
            className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={filters.tagId}
            onChange={(e) => onChange({ ...filters, tagId: e.target.value })}
          >
            <option value="all">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="filter-resolved-legacy" label={RESOLVED_COPY.filterLabel}>
          <select
            id="filter-resolved-legacy"
            className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={filters.resolved}
            onChange={(e) =>
              onChange({ ...filters, resolved: e.target.value as ResolvedFilter })
            }
          >
            <option value="all">All notes</option>
            <option value="resolved">{RESOLVED_COPY.showResolved}</option>
            <option value="unresolved">{RESOLVED_COPY.showUnresolved}</option>
          </select>
        </FormField>
      </div>
    </div>
  );
}

export function noteFiltersToSearch(filters: NoteFilterState) {
  return {
    search: filters.search,
    categoryId:
      filters.categoryId === "all"
        ? undefined
        : filters.categoryId === "none"
          ? null
          : filters.categoryId,
    tagId: filters.tagId === "all" ? undefined : filters.tagId,
    resolved: filters.resolved,
  };
}
