import type { VaultIndexNoteEntry } from "@/lib/crypto-client/vault-index-types";

export type SmartLocalFilter =
  | "all-active"
  | "pinned"
  | "favorites"
  | "resolved"
  | "unresolved"
  | "archived"
  | "trash"
  | "no-category"
  | "no-tags"
  | "checklist"
  | "recently-updated"
  | "daily-notes"
  | "drafts";

export const SMART_FILTER_OPTIONS: { value: SmartLocalFilter; label: string }[] = [
  { value: "all-active", label: "All active" },
  { value: "pinned", label: "Pinned" },
  { value: "favorites", label: "Favorites" },
  { value: "resolved", label: "Resolved" },
  { value: "unresolved", label: "Unresolved" },
  { value: "archived", label: "Archived" },
  { value: "trash", label: "Trash" },
  { value: "no-category", label: "No category" },
  { value: "no-tags", label: "No tags" },
  { value: "checklist", label: "Checklist notes" },
  { value: "recently-updated", label: "Recently updated" },
  { value: "daily-notes", label: "Daily notes" },
  { value: "drafts", label: "Drafts" },
];

export const DEFAULT_SMART_FILTER: SmartLocalFilter = "all-active";

/** Active = not archived and not trashed. */
export function isActiveNoteEntry(entry: VaultIndexNoteEntry): boolean {
  return !entry.archived && !entry.trashed;
}

/** Notes updated within the last 7 days. */
export function isRecentlyUpdated(entry: VaultIndexNoteEntry, now = Date.now()): boolean {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return now - new Date(entry.updatedAt).getTime() <= sevenDaysMs;
}

export function matchesSmartFilter(
  entry: VaultIndexNoteEntry,
  filter: SmartLocalFilter,
  options?: { draftNoteIds?: Set<string> }
): boolean {
  switch (filter) {
    case "all-active":
      return isActiveNoteEntry(entry);
    case "pinned":
      return isActiveNoteEntry(entry) && entry.pinned;
    case "favorites":
      return isActiveNoteEntry(entry) && entry.favorite;
    case "resolved":
      return isActiveNoteEntry(entry) && entry.answered;
    case "unresolved":
      return isActiveNoteEntry(entry) && !entry.answered;
    case "archived":
      return entry.archived && !entry.trashed;
    case "trash":
      return entry.trashed;
    case "no-category":
      return isActiveNoteEntry(entry) && entry.categoryId === null;
    case "no-tags":
      return isActiveNoteEntry(entry) && entry.tagIds.length === 0;
    case "checklist":
      return isActiveNoteEntry(entry) && Boolean(entry.hasChecklist);
    case "recently-updated":
      return isActiveNoteEntry(entry) && isRecentlyUpdated(entry);
    case "daily-notes":
      return isActiveNoteEntry(entry) && Boolean(entry.isDailyNote);
    case "drafts":
      return options?.draftNoteIds?.has(entry.id) ?? false;
    default:
      return isActiveNoteEntry(entry);
  }
}
