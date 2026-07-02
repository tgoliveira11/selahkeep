import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { encryptBytes, decryptBytes, encryptField, decryptField, encryptedPayloadCiphertextBytes } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { unwrapContentKey } from "./kanban";

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
  attachmentId: string,
  file: File,
  encryptedWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<EncryptedAttachmentPayload> {
  const contentKey = await unwrapContentKey(encryptedWrappedKey, vaultKey);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const metadata: AttachmentMetadataPlaintext = {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: bytes.byteLength,
  };

  const encryptedMetadata = await encryptField(JSON.stringify(metadata), contentKey, {
    userId,
    resourceId: attachmentId,
    field: "note_attachment_metadata",
  });
  const encryptedBlob = await encryptBytes(bytes, contentKey, {
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
  encryptedWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<DecryptedAttachment> {
  const contentKey = await unwrapContentKey(encryptedWrappedKey, vaultKey);
  const { userId, resourceId } = encryptedWrappedKey.aad;

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

  const metadataJson = await decryptField(record.encryptedMetadata, contentKey);
  const metadata = JSON.parse(metadataJson) as AttachmentMetadataPlaintext;
  const bytes = await decryptBytes(record.encryptedBlob, contentKey);

  return { metadata, bytes };
}
