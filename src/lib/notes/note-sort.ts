import type { NoteSearchResult } from "@/lib/crypto-client/note-search";

export type NoteSortOption =
  | "modified-desc"
  | "modified-asc"
  | "created-desc"
  | "created-asc"
  | "title-asc"
  | "title-desc";

export const DEFAULT_NOTE_SORT: NoteSortOption = "modified-desc";

export const NOTE_SORT_OPTIONS: { value: NoteSortOption; label: string }[] = [
  { value: "modified-desc", label: "Last modified (newest)" },
  { value: "modified-asc", label: "Last modified (oldest)" },
  { value: "created-desc", label: "Created (newest)" },
  { value: "created-asc", label: "Created (oldest)" },
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "title-desc", label: "Title (Z–A)" },
];

export function sortNotes(
  notes: NoteSearchResult[],
  sort: NoteSortOption
): NoteSearchResult[] {
  const sorted = [...notes];
  sorted.sort((a, b) => {
    switch (sort) {
      case "modified-desc":
        return b.updatedAt.localeCompare(a.updatedAt);
      case "modified-asc":
        return a.updatedAt.localeCompare(b.updatedAt);
      case "created-desc":
        return b.createdAt.localeCompare(a.createdAt);
      case "created-asc":
        return a.createdAt.localeCompare(b.createdAt);
      case "title-asc":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      case "title-desc":
        return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
      default:
        return 0;
    }
  });
  return sorted;
}
