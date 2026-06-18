import type { VaultIndexPlaintext, VaultIndexNoteEntry } from "./vault-index-types";
import { activeCategories, activeTags } from "./vault-index";
import type { SmartLocalFilter } from "@/lib/notes/smart-filters";
import { DEFAULT_SMART_FILTER, matchesSmartFilter } from "@/lib/notes/smart-filters";
import { matchNoteText, type NoteMatchField } from "@/lib/notes/note-text-search";
import { getRecentlyViewedNoteIds } from "@/lib/notes/recently-viewed";

export type ResolvedFilter = "all" | "resolved" | "unresolved";

/** @deprecated Use ResolvedFilter — maps to internal `answered` index field */
export type AnsweredFilter = "all" | "answered" | "unanswered";

export type NoteSearchFilters = {
  search?: string;
  categoryId?: string | null;
  tagId?: string;
  resolved?: ResolvedFilter;
  smartFilter?: SmartLocalFilter;
  draftNoteIds?: Set<string>;
};

export type NoteSearchResult = VaultIndexNoteEntry & {
  categoryName: string | null;
  tagNames: string[];
  bodySnippet?: string | null;
  matchedFields?: NoteMatchField[];
};

function resolveCategoryName(
  entry: VaultIndexNoteEntry,
  index: VaultIndexPlaintext
): string | null {
  if (!entry.categoryId) return null;
  return activeCategories(index).find((c) => c.id === entry.categoryId)?.name ?? null;
}

function resolveTagNames(entry: VaultIndexNoteEntry, index: VaultIndexPlaintext): string[] {
  return entry.tagIds
    .map((id) => activeTags(index).find((t) => t.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

function matchesMetadataSearch(
  entry: VaultIndexNoteEntry,
  query: string,
  index: VaultIndexPlaintext
): boolean {
  const categoryName = resolveCategoryName(entry, index);
  const tagNames = resolveTagNames(entry, index);
  return matchNoteText(query, { title: entry.title, categoryName, tagNames }).matches;
}

function matchesEntrySearch(
  entry: VaultIndexNoteEntry,
  query: string,
  index: VaultIndexPlaintext,
  bodies?: Map<string, string>
): { matches: boolean; bodySnippet: string | null; matchedFields: NoteMatchField[] } {
  const categoryName = resolveCategoryName(entry, index);
  const tagNames = resolveTagNames(entry, index);
  const body = bodies?.get(entry.id);
  return matchNoteText(query, {
    title: entry.title,
    categoryName,
    tagNames,
    body,
  });
}

function passesOrganizerFilters(entry: VaultIndexNoteEntry, filters: NoteSearchFilters): boolean {
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

  return true;
}

export function searchVaultIndex(
  index: VaultIndexPlaintext,
  filters: NoteSearchFilters,
  bodies?: Map<string, string>
): NoteSearchResult[] {
  const categories = activeCategories(index);
  const tags = activeTags(index);
  const smartFilter = filters.smartFilter ?? DEFAULT_SMART_FILTER;
  const searchQuery = filters.search ?? "";

  return index.entries
    .filter((entry) =>
      matchesSmartFilter(entry, smartFilter, {
        draftNoteIds: filters.draftNoteIds,
        recentlyViewedIds: getRecentlyViewedNoteIds(index),
      })
    )
    .filter((entry) => passesOrganizerFilters(entry, filters))
    .filter((entry) => {
      if (!searchQuery.trim()) return true;
      if (bodies) {
        return matchesEntrySearch(entry, searchQuery, index, bodies).matches;
      }
      return matchesMetadataSearch(entry, searchQuery, index);
    })
    .map((entry) => {
      const categoryName = entry.categoryId
        ? (categories.find((c) => c.id === entry.categoryId)?.name ?? null)
        : null;
      const tagNames = entry.tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter((name): name is string => Boolean(name));

      const searchMatch = searchQuery.trim()
        ? matchesEntrySearch(entry, searchQuery, index, bodies)
        : { matches: true, bodySnippet: null, matchedFields: [] as NoteMatchField[] };

      return {
        ...entry,
        categoryName,
        tagNames,
        bodySnippet: searchMatch.bodySnippet,
        matchedFields: searchMatch.matchedFields,
      };
    });
}

/** Locked vault: no decrypted index data should be shown. */
export function searchVaultIndexWhenLocked(): NoteSearchResult[] {
  return [];
}
