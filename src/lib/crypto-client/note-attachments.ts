import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { encryptBytes, decryptBytes, encryptField, decryptField, encryptedPayloadCiphertextBytes } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { unwrapNoteKey } from "./note-key";

export type AttachmentMetadataPlaintext = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export interface EncryptedAttachmentPayload {
  id: string;
  encryptedMetadata: EncryptedPayload;
  encryptedBlob: EncryptedPayload;
  blobEncryptionVersion: typeof ENCRYPTION_VERSION;
  ciphertextBytes: number;
}

export interface DecryptedAttachment {
  metadata: AttachmentMetadataPlaintext;
  bytes: Uint8Array;
}

export async function encryptAttachment(
  userId: string,
  noteId: string,
  attachmentId: string,
  file: File,
  encryptedWrappedNoteKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<EncryptedAttachmentPayload> {
  const noteKey = await unwrapNoteKey(encryptedWrappedNoteKey, vaultKey);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const metadata: AttachmentMetadataPlaintext = {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: bytes.byteLength,
  };

  const encryptedMetadata = await encryptField(JSON.stringify(metadata), noteKey, {
    userId,
    resourceId: attachmentId,
    field: "note_attachment_metadata",
  });
  const encryptedBlob = await encryptBytes(bytes, noteKey, {
    userId,
    resourceId: attachmentId,
    field: "note_attachment_blob",
  });

  const ciphertextBytes =
    encryptedPayloadCiphertextBytes(encryptedMetadata) +
    encryptedPayloadCiphertextBytes(encryptedBlob);

  return {
    id: attachmentId,
    encryptedMetadata,
    encryptedBlob,
    blobEncryptionVersion: ENCRYPTION_VERSION,
    ciphertextBytes,
  };
}

export async function decryptAttachment(
  record: EncryptedAttachmentPayload,
  encryptedWrappedNoteKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<DecryptedAttachment> {
  const noteKey = await unwrapNoteKey(encryptedWrappedNoteKey, vaultKey);
  const { userId, resourceId } = encryptedWrappedNoteKey.aad;

  verifyPayloadAad(record.encryptedMetadata, {
    userId,
    resourceId: record.id,
    field: "note_attachment_metadata",
  });
  verifyPayloadAad(record.encryptedBlob, {
    userId,
    resourceId: record.id,
    field: "note_attachment_blob",
  });

  const metadataJson = await decryptField(record.encryptedMetadata, noteKey);
  const metadata = JSON.parse(metadataJson) as AttachmentMetadataPlaintext;
  const bytes = await decryptBytes(record.encryptedBlob, noteKey);

  return { metadata, bytes };
}
