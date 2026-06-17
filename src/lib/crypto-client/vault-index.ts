import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { getSessionVaultKey } from "./vault";
import type {
  VaultCategory,
  VaultIndexNoteEntry,
  VaultIndexPlaintext,
  VaultIndexPlaintextV1,
  VaultTag,
  NoteMetadataForIndex,
} from "./vault-index-types";

export type {
  VaultCategory,
  VaultTag,
  VaultIndexNoteEntry,
  VaultIndexEntry,
  VaultIndexPlaintext,
  NoteMetadataForIndex,
} from "./vault-index-types";

export function createEmptyVaultIndex(): VaultIndexPlaintext {
  return { version: 2, categories: [], tags: [], entries: [] };
}

function isDeletedEntry(entry: VaultIndexNoteEntry): boolean {
  return Boolean(entry.deletedAt) || Boolean(entry.archived);
}

export function normalizeVaultIndex(parsed: VaultIndexPlaintextV1 | VaultIndexPlaintext): VaultIndexPlaintext {
  if (parsed.version === 2) {
    return {
      version: 2,
      categories: parsed.categories ?? [],
      tags: parsed.tags ?? [],
      entries: parsed.entries.map((entry) => ({
        ...entry,
        deletedAt: entry.deletedAt ?? (entry.archived ? entry.updatedAt : undefined),
      })),
    };
  }

  return {
    version: 2,
    categories: [],
    tags: [],
    entries: parsed.entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      categoryId: entry.categoryId,
      tagIds: entry.tagIds,
      answered: entry.answered,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.archived ? entry.updatedAt : undefined,
    })),
  };
}

export async function encryptVaultIndex(
  index: VaultIndexPlaintext,
  userId: string,
  vaultKey?: CryptoKey
): Promise<EncryptedPayload> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  return encryptField(JSON.stringify(index), key, {
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
  const parsed = JSON.parse(json) as VaultIndexPlaintextV1 | VaultIndexPlaintext;

  if (
    (parsed.version !== 1 && parsed.version !== 2) ||
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
  const without = index.entries.filter((e) => e.id !== entry.id);
  return {
    ...index,
    entries: [entry, ...without].sort(
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
  return addVaultIndexEntry(index, { ...existing, ...patch, id: noteId });
}

export function archiveVaultIndexEntry(
  index: VaultIndexPlaintext,
  noteId: string
): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return updateVaultIndexEntry(index, noteId, { deletedAt: now, updatedAt: now });
}

export function rebuildVaultIndexFromNotes(
  notes: NoteMetadataForIndex[],
  options?: { includeDeleted?: boolean; existing?: VaultIndexPlaintext }
): VaultIndexPlaintext {
  const includeDeleted = options?.includeDeleted ?? false;
  const base = options?.existing ?? createEmptyVaultIndex();

  const entries: VaultIndexNoteEntry[] = notes
    .filter((n) => includeDeleted || (!n.deletedAt && !n.archived))
    .map((n) => ({
      id: n.id,
      title: n.title,
      categoryId: n.categoryId,
      tagIds: n.tagIds,
      answered: n.answered,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      deletedAt: n.deletedAt ?? (n.archived ? n.updatedAt : undefined),
    }));

  return {
    version: 2,
    categories: base.categories,
    tags: base.tags,
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
    index: { ...index, categories: [...index.categories, category] },
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
    index: { ...index, tags: [...index.tags, tag] },
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
    tags: index.tags.map((t) =>
      t.id === tagId && !t.deletedAt ? { ...t, name, updatedAt: now } : t
    ),
  };
}

export function deleteVaultTag(index: VaultIndexPlaintext, tagId: string): VaultIndexPlaintext {
  const now = new Date().toISOString();
  return {
    ...index,
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
  return index.entries.filter((e) => !isDeletedEntry(e));
}

export { activeCategories, activeTags };
