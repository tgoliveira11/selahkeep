import type { VaultIndexPlaintext, VaultIndexNoteEntry } from "./vault-index-types";
import { getActiveVaultEntries, activeCategories, activeTags } from "./vault-index";

export type ResolvedFilter = "all" | "resolved" | "unresolved";

/** @deprecated Use ResolvedFilter — maps to internal `answered` index field */
export type AnsweredFilter = "all" | "answered" | "unanswered";

export type NoteSearchFilters = {
  search?: string;
  categoryId?: string | null;
  tagId?: string;
  resolved?: ResolvedFilter;
};

export type NoteSearchResult = VaultIndexNoteEntry & {
  categoryName: string | null;
  tagNames: string[];
};

function matchesSearch(
  entry: VaultIndexNoteEntry,
  query: string,
  index: VaultIndexPlaintext
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (entry.title.toLowerCase().includes(normalized)) return true;

  if (entry.categoryId) {
    const category = activeCategories(index).find((c) => c.id === entry.categoryId);
    if (category?.name.toLowerCase().includes(normalized)) return true;
  }

  for (const tagId of entry.tagIds) {
    const tag = activeTags(index).find((t) => t.id === tagId);
    if (tag?.name.toLowerCase().includes(normalized)) return true;
  }

  return false;
}

export function searchVaultIndex(
  index: VaultIndexPlaintext,
  filters: NoteSearchFilters
): NoteSearchResult[] {
  const categories = activeCategories(index);
  const tags = activeTags(index);

  return getActiveVaultEntries(index)
    .filter((entry) => {
      if (filters.categoryId !== undefined) {
        if (filters.categoryId === null) {
          if (entry.categoryId !== null) return false;
        } else if (entry.categoryId !== filters.categoryId) {
          return false;
        }
      }

      if (filters.tagId && !entry.tagIds.includes(filters.tagId)) {
        return false;
      }

      if (filters.resolved === "resolved" && !entry.answered) return false;
      if (filters.resolved === "unresolved" && entry.answered) return false;

      return matchesSearch(entry, filters.search ?? "", index);
    })
    .map((entry) => ({
      ...entry,
      categoryName: entry.categoryId
        ? (categories.find((c) => c.id === entry.categoryId)?.name ?? null)
        : null,
      tagNames: entry.tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    }));
}

/** Locked vault: no decrypted index data should be shown. */
export function searchVaultIndexWhenLocked(): NoteSearchResult[] {
  return [];
}
