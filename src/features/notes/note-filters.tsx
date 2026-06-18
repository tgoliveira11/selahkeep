"use client";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { RESOLVED_COPY } from "@/lib/notes/resolved-labels";
import type { ResolvedFilter } from "@/lib/crypto-client/note-search";
import type { VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";

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
}

export function hasNoteOrganizers(categories: VaultCategory[], tags: VaultTag[]): boolean {
  return categories.length > 0 || tags.length > 0;
}

export function NoteFilters({ filters, categories, tags, onChange }: NoteFiltersProps) {
  if (!hasNoteOrganizers(categories, tags)) {
    return null;
  }

  return (
    <div className="note-filters mb-6 space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)]">
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
        <FormField id="filter-category" label="Category">
          <select
            id="filter-category"
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

        <FormField id="filter-tag" label="Tag">
          <select
            id="filter-tag"
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

        <FormField id="filter-resolved" label={RESOLVED_COPY.filterLabel}>
          <select
            id="filter-resolved"
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
