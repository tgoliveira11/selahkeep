import type {
  RecentlyViewedNote,
  VaultIndexNoteEntry,
  VaultIndexPlaintext,
} from "@/lib/crypto-client/vault-index-types";

export const MAX_RECENTLY_VIEWED = 20;

export function recordRecentlyViewed(
  index: VaultIndexPlaintext,
  noteId: string,
  viewedAt = new Date().toISOString()
): VaultIndexPlaintext {
  const existing = index.recentlyViewed ?? [];
  const without = existing.filter((item) => item.noteId !== noteId);
  const next: RecentlyViewedNote[] = [{ noteId, viewedAt }, ...without].slice(
    0,
    MAX_RECENTLY_VIEWED
  );
  return { ...index, recentlyViewed: next };
}

export function getRecentlyViewedNoteIds(index: VaultIndexPlaintext): string[] {
  return (index.recentlyViewed ?? []).map((item) => item.noteId);
}

export function resolveRecentlyViewedEntries(
  index: VaultIndexPlaintext,
  limit = MAX_RECENTLY_VIEWED
): VaultIndexNoteEntry[] {
  const ids = getRecentlyViewedNoteIds(index).slice(0, limit);
  const byId = new Map(index.entries.map((entry) => [entry.id, entry]));
  return ids.map((id) => byId.get(id)).filter((entry): entry is VaultIndexNoteEntry => Boolean(entry));
}
