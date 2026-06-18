import type { NoteFilterState } from "@/features/notes/note-filters";
import { DEFAULT_SMART_FILTER, type SmartLocalFilter } from "@/lib/notes/smart-filters";

export function hasActiveNoteFilters(filters: NoteFilterState): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.categoryId !== "all" ||
    filters.tagId !== "all" ||
    filters.resolved !== "all"
  );
}

export type NotesListControlsVisibilityInput = {
  hasOrganizers: boolean;
  totalNotes: number;
  smartFilter: SmartLocalFilter;
  filters: NoteFilterState;
  hasSavedViews: boolean;
};

/** Whether the unified /notes list controls region should render. */
export function shouldShowNotesListControls(input: NotesListControlsVisibilityInput): boolean {
  if (input.hasOrganizers) return true;
  if (input.hasSavedViews) return true;
  if (input.smartFilter !== DEFAULT_SMART_FILTER) return true;
  if (hasActiveNoteFilters(input.filters)) return true;
  if (input.totalNotes >= 1) return true;
  return false;
}
