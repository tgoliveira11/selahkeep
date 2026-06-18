"use client";

import { ToolbarMenu } from "@/components/ui/toolbar-menu";
import { IconFilters } from "@/components/ui/toolbar-icons";
import {
  AdvancedNoteFilters,
  hasAdvancedFilterFields,
  type NoteFilterState,
} from "@/features/notes/note-filters";
import type { SmartLocalFilter } from "@/lib/notes/smart-filters";
import type { VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";

interface AdvancedFiltersMenuProps {
  filters: NoteFilterState;
  onFiltersChange: (filters: NoteFilterState) => void;
  categories: VaultCategory[];
  tags: VaultTag[];
  smartFilter: SmartLocalFilter;
  onSmartFilterChange: (filter: SmartLocalFilter) => void;
}

export function hasAdvancedFiltersMenu(
  categories: VaultCategory[],
  tags: VaultTag[]
): boolean {
  return hasAdvancedFilterFields(categories, tags);
}

/** Progressive disclosure for category, tag, status, and optional smart filters. */
export function AdvancedFiltersMenu({
  filters,
  onFiltersChange,
  categories,
  tags,
  smartFilter,
  onSmartFilterChange,
}: AdvancedFiltersMenuProps) {
  const active =
    filters.categoryId !== "all" ||
    filters.tagId !== "all" ||
    filters.resolved !== "all" ||
    smartFilter === "no-category" ||
    smartFilter === "no-tags" ||
    smartFilter === "checklist";

  return (
    <ToolbarMenu label="Filters" testId="advanced-filters-menu" active={active} icon={<IconFilters />}>
      <AdvancedNoteFilters
        filters={filters}
        categories={categories}
        tags={tags}
        smartFilter={smartFilter}
        onChange={onFiltersChange}
        onSmartFilterChange={onSmartFilterChange}
      />
    </ToolbarMenu>
  );
}
