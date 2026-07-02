import { notesApi } from "@/lib/api-client/notes";
import { decryptNote } from "@/lib/crypto-client/notes";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { decryptVaultSettings } from "@/lib/crypto-client/vault-settings";
import { vaultApi } from "@/lib/api-client/vault";

const bodyCache = new Map<string, string>();

export function getCachedNoteBody(noteId: string): string | undefined {
  return bodyCache.get(noteId);
}

export function setCachedNoteBody(noteId: string, body: string): void {
  bodyCache.set(noteId, body);
}

export function clearNoteBodyCache(): void {
  bodyCache.clear();
}

export async function applyUnlockBehavior(userId: string): Promise<void> {
  const vaultKey = getSessionVaultKey();
  if (!vaultKey) return;

  const { encryptedVaultSettings } = await vaultApi.getSettings();
  const settings = encryptedVaultSettings
    ? await decryptVaultSettings(encryptedVaultSettings, userId, vaultKey)
    : { unlockBehavior: "metadata_only" as const };

  if (settings.unlockBehavior !== "decrypt_all") {
    clearNoteBodyCache();
    return;
  }

  const notes = await notesApi.list();
  clearNoteBodyCache();
  await Promise.all(
    notes.map(async (note) => {
      const decrypted = await decryptNote(
        note.encryptedMetadata,
        note.encryptedBody,
        note.encryptedWrappedNoteKey,
        vaultKey
      );
      setCachedNoteBody(note.id, decrypted.body);
    })
  );
}
