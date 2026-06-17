import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { getSessionVaultKey } from "./vault";
import type {
  VaultIndexEntry,
  VaultIndexPlaintext,
  NoteMetadataForIndex,
} from "./vault-index-types";

export type { VaultIndexEntry, VaultIndexPlaintext, NoteMetadataForIndex } from "./vault-index-types";

export function createEmptyVaultIndex(): VaultIndexPlaintext {
  return { version: 1, entries: [] };
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
  const parsed = JSON.parse(json) as VaultIndexPlaintext;

  if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error("Invalid vault index format");
  }

  return parsed;
}

export function addVaultIndexEntry(
  index: VaultIndexPlaintext,
  entry: VaultIndexEntry
): VaultIndexPlaintext {
  const without = index.entries.filter((e) => e.id !== entry.id);
  return {
    version: 1,
    entries: [entry, ...without].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  };
}

export function updateVaultIndexEntry(
  index: VaultIndexPlaintext,
  noteId: string,
  patch: Partial<Omit<VaultIndexEntry, "id">>
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
  return updateVaultIndexEntry(index, noteId, { archived: true });
}

export function rebuildVaultIndexFromNotes(
  notes: NoteMetadataForIndex[],
  options?: { includeArchived?: boolean }
): VaultIndexPlaintext {
  const includeArchived = options?.includeArchived ?? false;
  const entries: VaultIndexEntry[] = notes
    .filter((n) => includeArchived || !n.archived)
    .map((n) => ({
      id: n.id,
      title: n.title,
      categoryId: n.categoryId,
      tagIds: n.tagIds,
      answered: n.answered,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      archived: n.archived ?? false,
    }));

  return {
    version: 1,
    entries: entries.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  };
}
