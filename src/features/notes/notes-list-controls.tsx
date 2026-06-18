"use client";

import { Input } from "@/components/ui/input";
import { AdvancedFiltersMenu } from "@/features/notes/advanced-filters-menu";
import { SavedViewsMenu } from "@/features/notes/saved-views-menu";
import { SmartFilterChips } from "@/features/notes/smart-filter-chips";
import { SortControl } from "@/features/notes/sort-control";
import { ViewModeToggle } from "@/features/notes/view-mode-toggle";
import type { NoteFilterState } from "@/features/notes/note-filters";
import { formatNoteCount } from "@/lib/notes/note-count";
import type { NoteSortOption } from "@/lib/notes/note-sort";
import type { SavedViewCriteria } from "@/lib/notes/saved-views";
import type { SmartLocalFilter } from "@/lib/notes/smart-filters";
import type { NoteViewMode } from "@/lib/notes/note-view-mode";
import type { SavedView, VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";

interface NotesListControlsProps {
  filteredCount: number;
  totalCount: number;
  sort: NoteSortOption;
  onSortChange: (sort: NoteSortOption) => void;
  viewMode: NoteViewMode;
  onViewModeChange: (mode: NoteViewMode) => void;
  smartFilter: SmartLocalFilter;
  onSmartFilterChange: (filter: SmartLocalFilter) => void;
  filters: NoteFilterState;
  onFiltersChange: (filters: NoteFilterState) => void;
  categories: VaultCategory[];
  tags: VaultTag[];
  savedViews: SavedView[];
  activeSavedViewId: string | null;
  currentSavedViewCriteria: SavedViewCriteria;
  onApplySavedView: (view: { id: string; criteria: SavedViewCriteria }) => void;
  onSaveView: (name: string, criteria: SavedViewCriteria) => void | Promise<void>;
  onDeleteSavedView: (viewId: string) => void | Promise<void>;
  onRecentlyViewed?: () => void;
  trashNotice?: boolean;
}

/** Compact single-row toolbar for search, filters, sort, view mode, chips, and note count on `/notes`. */
export function NotesListControls({
  filteredCount,
  totalCount,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  smartFilter,
  onSmartFilterChange,
  filters,
  onFiltersChange,
  categories,
  tags,
  savedViews,
  activeSavedViewId,
  currentSavedViewCriteria,
  onApplySavedView,
  onSaveView,
  onDeleteSavedView,
  onRecentlyViewed,
  trashNotice,
}: NotesListControlsProps) {
  const noteCountLabel = formatNoteCount(filteredCount, totalCount);

  return (
    <section
      className="notes-list-controls mb-6"
      data-testid="notes-list-controls"
      aria-label="Notes list controls"
    >
      <div className="notes-list-controls__shell rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
        <div className="notes-list-controls__toolbar">
          <div className="notes-list-controls__search">
            <Input
              id="note-search"
              type="search"
              aria-label="Search notes"
              data-testid="note-search"
              placeholder="Search titles, notes, tags…"
              className="min-h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="notes-list-controls__actions">
            <SavedViewsMenu
              views={savedViews}
              activeViewId={activeSavedViewId}
              currentCriteria={currentSavedViewCriteria}
              onApply={onApplySavedView}
              onSave={onSaveView}
              onDelete={onDeleteSavedView}
              onRecentlyViewed={onRecentlyViewed}
            />
            <AdvancedFiltersMenu
              filters={filters}
              onFiltersChange={onFiltersChange}
              categories={categories}
              tags={tags}
              smartFilter={smartFilter}
              onSmartFilterChange={onSmartFilterChange}
            />
            <SortControl value={sort} onChange={onSortChange} />
            <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
          </div>
        </div>

        <div className="notes-list-controls__filters-row">
          <SmartFilterChips value={smartFilter} onChange={onSmartFilterChange} />
          <p
            className="notes-list-controls__count"
            data-testid="notes-counter"
            aria-live="polite"
          >
            {noteCountLabel}
          </p>
        </div>
      </div>

      {trashNotice && (
        <p className="mt-3 text-sm text-[var(--muted)]" data-testid="trash-notice">
          Trash auto-purge is not implemented yet. Notes remain until you delete them permanently.
        </p>
      )}
    </section>
  );
}
