import type { NoteMetadataPlaintext } from "@/lib/crypto-client/notes";
import type { VaultIndexNoteEntry } from "@/lib/crypto-client/vault-index-types";
import { countChecklistItems } from "@/lib/notes/markdown-checklist";
import { isDailyNoteTitle } from "@/lib/notes/daily-note";

/** Default lifecycle fields for new or legacy notes. */
export const DEFAULT_LIFECYCLE = {
  pinned: false,
  favorite: false,
  archived: false,
  trashed: false,
  trashedAt: null as string | null,
} as const;

/** Normalize decrypted metadata after vault unlock (backward compatible). */
export function normalizeNoteMetadata(
  raw: Partial<NoteMetadataPlaintext> & Pick<NoteMetadataPlaintext, "title">
): NoteMetadataPlaintext {
  const now = new Date().toISOString();
  return {
    title: raw.title,
    categoryId: raw.categoryId ?? null,
    tagIds: raw.tagIds ?? [],
    answered: raw.answered ?? false,
    pinned: raw.pinned ?? DEFAULT_LIFECYCLE.pinned,
    favorite: raw.favorite ?? DEFAULT_LIFECYCLE.favorite,
    archived: raw.archived ?? DEFAULT_LIFECYCLE.archived,
    trashed: raw.trashed ?? DEFAULT_LIFECYCLE.trashed,
    trashedAt: raw.trashedAt ?? DEFAULT_LIFECYCLE.trashedAt,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

export function metadataToIndexEntry(
  noteId: string,
  metadata: NoteMetadataPlaintext,
  body?: string
): VaultIndexNoteEntry {
  return {
    id: noteId,
    title: metadata.title,
    categoryId: metadata.categoryId,
    tagIds: metadata.tagIds,
    answered: metadata.answered,
    pinned: metadata.pinned,
    favorite: metadata.favorite,
    archived: metadata.archived,
    trashed: metadata.trashed,
    trashedAt: metadata.trashedAt,
    hasChecklist: body !== undefined ? countChecklistItems(body) > 0 : undefined,
    isDailyNote: isDailyNoteTitle(metadata.title),
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  };
}

export function indexEntryToMetadataPatch(
  entry: VaultIndexNoteEntry
): Pick<
  NoteMetadataPlaintext,
  | "title"
  | "categoryId"
  | "tagIds"
  | "answered"
  | "pinned"
  | "favorite"
  | "archived"
  | "trashed"
  | "trashedAt"
  | "createdAt"
  | "updatedAt"
> {
  return {
    title: entry.title,
    categoryId: entry.categoryId,
    tagIds: entry.tagIds,
    answered: entry.answered,
    pinned: entry.pinned,
    favorite: entry.favorite,
    archived: entry.archived,
    trashed: entry.trashed,
    trashedAt: entry.trashedAt ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/** Title for duplicated notes per product decision. */
export function duplicateNoteTitle(originalTitle: string): string {
  const trimmed = originalTitle.trim() || "Untitled";
  return `Copy of ${trimmed}`;
}

/** Lifecycle reset for duplicated notes. */
export function duplicateNoteMetadata(
  source: NoteMetadataPlaintext,
  body: string,
  createdAt: string,
  updatedAt: string
): NoteMetadataPlaintext {
  return normalizeNoteMetadata({
    title: duplicateNoteTitle(source.title),
    categoryId: source.categoryId,
    tagIds: [...source.tagIds],
    answered: false,
    pinned: false,
    favorite: false,
    archived: false,
    trashed: false,
    trashedAt: null,
    createdAt,
    updatedAt,
  });
}
