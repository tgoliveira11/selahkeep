import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { normalizeNoteMetadata } from "@/lib/notes/note-metadata";
import type { NoteMetadataPlaintext } from "./notes";
import { encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { unwrapNoteKey } from "./note-key";

/**
 * An immutable, encrypted snapshot of a note's editable content.
 *
 * A version reuses the note's existing Note Key (see ADR-005 / TDR Note Version
 * History). The content payloads are AAD-bound to a unique `versionId` so the
 * server cannot swap one version's ciphertext for another. The wrapped note key
 * is a copy of the note's own wrapped key (AAD bound to `noteId`).
 */
export interface EncryptedNoteVersionPayload {
  id: string;
  encryptedMetadata: EncryptedPayload;
  encryptedBody: EncryptedPayload;
  encryptedWrappedNoteKey: EncryptedPayload;
  bodyEncryptionVersion: typeof ENCRYPTION_VERSION;
}

export interface DecryptedNoteVersion {
  metadata: NoteMetadataPlaintext;
  body: string;
}

/**
 * Encrypt a snapshot of a note's content as a new version.
 *
 * The note's existing wrapped note key is unwrapped to recover the Note Key,
 * which encrypts the version metadata/body. No new key material is generated.
 */
export async function encryptNoteVersion(
  userId: string,
  noteId: string,
  versionId: string,
  metadata: NoteMetadataPlaintext,
  body: string,
  existingWrappedNoteKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<EncryptedNoteVersionPayload> {
  const noteKey = await unwrapNoteKey(existingWrappedNoteKey, vaultKey);

  const encryptedMetadata = await encryptField(JSON.stringify(metadata), noteKey, {
    userId,
    resourceId: versionId,
    field: "note_version_metadata",
  });
  const encryptedBody = await encryptField(body, noteKey, {
    userId,
    resourceId: versionId,
    field: "note_version_body",
  });

  return {
    id: versionId,
    encryptedMetadata,
    encryptedBody,
    encryptedWrappedNoteKey: existingWrappedNoteKey,
    bodyEncryptionVersion: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypt only a version's metadata snapshot (title, timestamps, lifecycle).
 * Used to build the history list without decrypting every body up front.
 */
export async function decryptNoteVersionMetadata(
  encryptedMetadata: EncryptedPayload,
  encryptedWrappedNoteKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<NoteMetadataPlaintext> {
  const noteKey = await unwrapNoteKey(encryptedWrappedNoteKey, vaultKey);
  const versionId = encryptedMetadata.aad.resourceId;
  verifyPayloadAad(encryptedMetadata, {
    userId: encryptedMetadata.aad.userId,
    resourceId: versionId,
    field: "note_version_metadata",
  });
  const metadataJson = await decryptField(encryptedMetadata, noteKey);
  const parsed = JSON.parse(metadataJson) as Partial<NoteMetadataPlaintext> & {
    title?: string;
  };
  return normalizeNoteMetadata({ title: parsed.title ?? "", ...parsed });
}

/**
 * Decrypt a stored note version. Verifies that the content payloads are bound
 * to the version id and the wrapped key to the note id before returning bytes.
 */
export async function decryptNoteVersion(
  encryptedMetadata: EncryptedPayload,
  encryptedBody: EncryptedPayload,
  encryptedWrappedNoteKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<DecryptedNoteVersion> {
  const noteKey = await unwrapNoteKey(encryptedWrappedNoteKey, vaultKey);

  const versionId = encryptedMetadata.aad.resourceId;
  verifyPayloadAad(encryptedMetadata, {
    userId: encryptedMetadata.aad.userId,
    resourceId: versionId,
    field: "note_version_metadata",
  });
  verifyPayloadAad(encryptedBody, {
    userId: encryptedBody.aad.userId,
    resourceId: versionId,
    field: "note_version_body",
  });

  const metadataJson = await decryptField(encryptedMetadata, noteKey);
  const parsed = JSON.parse(metadataJson) as Partial<NoteMetadataPlaintext> & {
    title?: string;
  };
  const metadata = normalizeNoteMetadata({ title: parsed.title ?? "", ...parsed });
  const body = await decryptField(encryptedBody, noteKey);

  return { metadata, body };
}
