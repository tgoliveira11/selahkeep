import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { generateAesKey, exportAesKey, importAesKey, encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { getSessionVaultKey } from "./vault";
import { bytesToBase64Url, base64UrlToBytes } from "./encoding";

export async function generateNoteKey(): Promise<CryptoKey> {
  return generateAesKey();
}

export async function wrapNoteKey(
  userId: string,
  noteId: string,
  noteKey: CryptoKey,
  vaultKey?: CryptoKey
): Promise<EncryptedPayload> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  const noteKeyBytes = await exportAesKey(noteKey);
  const noteKeyB64 = bytesToBase64Url(noteKeyBytes);
  return encryptField(noteKeyB64, key, {
    userId,
    resourceId: noteId,
    field: "note_key",
  });
}

export async function unwrapNoteKey(
  encryptedWrappedNoteKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<CryptoKey> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  verifyPayloadAad(encryptedWrappedNoteKey, {
    userId: encryptedWrappedNoteKey.aad.userId,
    resourceId: encryptedWrappedNoteKey.aad.resourceId,
    field: "note_key",
  });

  const noteKeyB64 = await decryptField(encryptedWrappedNoteKey, key);
  const noteKeyBytes = base64UrlToBytes(noteKeyB64);
  return importAesKey(noteKeyBytes);
}
