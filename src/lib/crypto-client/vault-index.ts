import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { getSessionVaultKey } from "./vault";
import { isDailyNoteTitle } from "@/lib/notes/daily-note";
import type {
  VaultCategory,
  VaultIndexNoteEntry,
  VaultIndexPlaintext,
  VaultIndexPlaintextV1,
  VaultIndexPlaintextV2,
  VaultTag,
  NoteMetadataForIndex,
} from "./vault-index-types";

export type {
  VaultCategory,
  VaultTag,
  VaultIndexNoteEntry,
  VaultIndexEntry,
  VaultIndexPlaintext,
  SavedView,
  SavedViewCriteria,
  NoteMetadataForIndex,
} from "./vault-index-types";

const DEFAULT_ENTRY_LIFECYCLE = {
  pinned: false,
  favorite: false,
  archived: false,
  trashed: false,
  trashedAt: null as string | null,
};

export function createEmptyVaultIndex(): VaultIndexPlaintext {
  return { version: 3, categories: [], tags: [], entries: [], savedViews: [] };
}

function normalizeIndexEntry(entry: Partial<VaultIndexNoteEntry> & { id: string }): VaultIndexNoteEntry {
  const trashedFromLegacy = Boolean(entry.deletedAt) || Boolean(entry.trashed);
  const trashedAt =
    entry.trashedAt ?? (entry.deletedAt ? entry.deletedAt : trashedFromLegacy ? entry.updatedAt : null);

  return {
    id: entry.id,
    title: entry.title ?? "",
    categoryId: entry.categoryId ?? null,
    tagIds: entry.tagIds ?? [],
    answered: entry.answered ?? false,
    pinned: entry.pinned ?? DEFAULT_ENTRY_LIFECYCLE.pinned,
    favorite: entry.favorite ?? DEFAULT_ENTRY_LIFECYCLE.favorite,
    archived: entry.archived ?? DEFAULT_ENTRY_LIFECYCLE.archived,
    trashed: trashedFromLegacy,
    trashedAt: trashedFromLegacy ? trashedAt : null,
    hasChecklist: entry.hasChecklist,
    isDailyNote: entry.isDailyNote ?? isDailyNoteTitle(entry.title ?? ""),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}

function migrateToV3(
  parsed: VaultIndexPlaintextV1 | VaultIndexPlaintextV2 | VaultIndexPlaintext
): VaultIndexPlaintext {
  if (parsed.version === 3) {
    return {
      version: 3,
      categories: parsed.categories ?? [],
      tags: parsed.tags ?? [],
      entries: parsed.entries.map((entry) => normalizeIndexEntry(entry)),
      savedViews: parsed.savedViews ?? [],
    };
  }

  if (parsed.version === 2) {
    return {
      version: 3,
      categories: parsed.categories ?? [],
      tags: parsed.tags ?? [],
      entries: parsed.entries.map((entry) => normalizeIndexEntry(entry)),
      savedViews: [],
    };
  }

  return {
    version: 3,
    categories: [],
    tags: [],
    entries: parsed.entries.map((entry) =>
      normalizeIndexEntry({
        ...entry,
        archived: false,
        trashed: entry.archived ? true : undefined,
        trashedAt: entry.archived ? entry.updatedAt : undefined,
      })
    ),
    savedViews: [],
  };
}

export function normalizeVaultIndex(
  parsed: VaultIndexPlaintextV1 | VaultIndexPlaintextV2 | VaultIndexPlaintext
): VaultIndexPlaintext {
  return migrateToV3(parsed);
}

export async function encryptVaultIndex(
  index: VaultIndexPlaintext | VaultIndexPlaintextV1 | VaultIndexPlaintextV2,
  userId: string,
  vaultKey?: CryptoKey
): Promise<EncryptedPayload> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  const payload = normalizeVaultIndex(index);

  return encryptField(JSON.stringify(payload), key, {
    userId,
    resourceId: userId,
    field: "vault_index",
  });
}

export async function decryptVaultIndex(
  encryptedVaultIndex: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<VaultIndexPlaintext> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  verifyPayloadAad(encryptedVaultIndex, {
    userId: encryptedVaultIndex.aad.userId,
    resourceId: encryptedVaultIndex.aad.userId,
    field: "vault_index",
  });

  const json = await decryptField(encryptedVaultIndex, key);
  const parsed = JSON.parse(json) as VaultIndexPlaintextV1 | VaultIndexPlaintextV2 | VaultIndexPlaintext;

  if (
    (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) ||
    !Array.isArray(parsed.entries)
  ) {
    throw new Error("Invalid vault index format");
  }

  return normalizeVaultIndex(parsed);
}

export function addVaultIndexEntry(
  index: VaultIndexPlaintext,
  entry: VaultIndexNoteEntry
): VaultIndexPlaintext {
  const normalized = normalizeIndexEntry(entry);
  const without = index.entries.filter((e) => e.id !== normalized.id);
  return {
    ...index,
    version: 3,
    entries: [normalized, ...without].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  };
}

export function updateVaultIndexEntry(
  index: VaultIndexPlaintext,
  noteId: string,
  patch: Partial<Omit<VaultIndexNoteEntry, "id">>
): VaultIndexPlaintext {
  const existing = index.entries.find((e) => e.id === noteId);
  if (!existing) {
    throw new Error("Note not found in vault index");
  }
  return addVaultIndexEntry(index, normalizeIndexEntry({ ...existing, ...patch, id: noteId }));
}

export function removeVaultIndexEntry(index: VaultIndexPlaintext, noteId: string): VaultIndexPlaintext {
  return {
    ...index,
    version: 3,
    entries: index.entries.filter((e) => e.id !== noteId),
  };
}

/** @deprecated Use trashVaultIndexEntry — kept for test migration coverage */
export function archiveVaultIndexEntry(
  index: VaultIndexPlaintext,
  noteId: string
): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return updateVaultIndexEntry(index, noteId, { trashed: true, trashedAt: now, updatedAt: now });
}

export function trashVaultIndexEntry(index: VaultIndexPlaintext, noteId: string): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return updateVaultIndexEntry(index, noteId, {
    trashed: true,
    trashedAt: now,
    pinned: false,
    updatedAt: now,
  });
}

export function restoreVaultIndexEntry(index: VaultIndexPlaintext, noteId: string): VaultIndexPlaintext {
  return updateVaultIndexEntry(index, noteId, {
    trashed: false,
    trashedAt: null,
    updatedAt: new Date().toISOString(),
  });
}

export function setNoteArchived(
  index: VaultIndexPlaintext,
  noteId: string,
  archived: boolean
): VaultIndexPlaintext {
  return updateVaultIndexEntry(index, noteId, {
    archived,
    pinned: archived ? false : undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function rebuildVaultIndexFromNotes(
  notes: NoteMetadataForIndex[],
  options?: { includeDeleted?: boolean; existing?: VaultIndexPlaintext }
): VaultIndexPlaintext {
  const includeDeleted = options?.includeDeleted ?? false;
  const base = options?.existing ?? createEmptyVaultIndex();

  const entries: VaultIndexNoteEntry[] = notes
    .filter((n) => {
      const trashed = n.trashed ?? Boolean(n.deletedAt);
      const archived = n.archived ?? false;
      if (includeDeleted) return true;
      return !trashed && !archived;
    })
    .map((n) =>
      normalizeIndexEntry({
        id: n.id,
        title: n.title,
        categoryId: n.categoryId,
        tagIds: n.tagIds,
        answered: n.answered,
        pinned: n.pinned,
        favorite: n.favorite,
        archived: n.archived,
        trashed: n.trashed ?? Boolean(n.deletedAt),
        trashedAt: n.trashedAt ?? n.deletedAt,
        hasChecklist: n.hasChecklist,
        isDailyNote: n.isDailyNote,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        deletedAt: n.deletedAt,
      })
    );

  return {
    version: 3,
    categories: base.categories,
    tags: base.tags,
    savedViews: base.savedViews ?? [],
    entries: entries.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  };
}

function activeCategories(index: VaultIndexPlaintext): VaultCategory[] {
  return index.categories.filter((c) => !c.deletedAt);
}

function activeTags(index: VaultIndexPlaintext): VaultTag[] {
  return index.tags.filter((t) => !t.deletedAt);
}

export function addVaultCategory(
  index: VaultIndexPlaintext,
  name: string,
  id: string = crypto.randomUUID()
): { index: VaultIndexPlaintext; category: VaultCategory } {
  const now = new Date().toISOString();
  const category: VaultCategory = { id, name, createdAt: now, updatedAt: now };
  return {
    index: { ...index, version: 3, categories: [...index.categories, category] },
    category,
  };
}

export function updateVaultCategory(
  index: VaultIndexPlaintext,
  categoryId: string,
  name: string
): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return {
    ...index,
    version: 3,
    categories: index.categories.map((c) =>
      c.id === categoryId && !c.deletedAt ? { ...c, name, updatedAt: now } : c
    ),
  };
}

export function deleteVaultCategory(
  index: VaultIndexPlaintext,
  categoryId: string
): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return {
    ...index,
    version: 3,
    categories: index.categories.map((c) =>
      c.id === categoryId ? { ...c, deletedAt: now, updatedAt: now } : c
    ),
    entries: index.entries.map((e) =>
      e.categoryId === categoryId ? { ...e, categoryId: null, updatedAt: now } : e
    ),
  };
}

export function addVaultTag(
  index: VaultIndexPlaintext,
  name: string,
  id: string = crypto.randomUUID()
): { index: VaultIndexPlaintext; tag: VaultTag } {
  const now = new Date().toISOString();
  const tag: VaultTag = { id, name, createdAt: now, updatedAt: now };
  return {
    index: { ...index, version: 3, tags: [...index.tags, tag] },
    tag,
  };
}

export function updateVaultTag(
  index: VaultIndexPlaintext,
  tagId: string,
  name: string
): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return {
    ...index,
    version: 3,
    tags: index.tags.map((t) =>
      t.id === tagId && !t.deletedAt ? { ...t, name, updatedAt: now } : t
    ),
  };
}

export function deleteVaultTag(index: VaultIndexPlaintext, tagId: string): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return {
    ...index,
    version: 3,
    tags: index.tags.map((t) =>
      t.id === tagId ? { ...t, deletedAt: now, updatedAt: now } : t
    ),
    entries: index.entries.map((e) =>
      e.tagIds.includes(tagId)
        ? { ...e, tagIds: e.tagIds.filter((id) => id !== tagId), updatedAt: now }
        : e
    ),
  };
}

export function getActiveVaultEntries(index: VaultIndexPlaintext): VaultIndexNoteEntry[] {
  return index.entries.filter((e) => !e.archived && !e.trashed);
}

export function getArchivedVaultEntries(index: VaultIndexPlaintext): VaultIndexNoteEntry[] {
  return index.entries.filter((e) => e.archived && !e.trashed);
}

export function getTrashedVaultEntries(index: VaultIndexPlaintext): VaultIndexNoteEntry[] {
  return index.entries.filter((e) => e.trashed);
}

export { activeCategories, activeTags };
