import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { generateAesKey, encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { generateNoteKey, wrapNoteKey, unwrapNoteKey } from "./note-key";

export const TITLE_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 50_000;

export type NoteMetadataPlaintext = {
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface EncryptedNotePayload {
  encryptedMetadata: EncryptedPayload;
  encryptedBody: EncryptedPayload;
  encryptedWrappedNoteKey: EncryptedPayload;
  bodyEncryptionVersion: typeof ENCRYPTION_VERSION;
}

export interface DecryptedNote {
  metadata: NoteMetadataPlaintext;
  body: string;
}

export type EncryptNoteInput = {
  title: string;
  body: string;
  categoryId?: string | null;
  tagIds?: string[];
  answered?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function encryptNote(
  userId: string,
  noteId: string,
  input: EncryptNoteInput,
  vaultKey?: CryptoKey
): Promise<EncryptedNotePayload> {
  if (input.title.length > TITLE_MAX_LENGTH) throw new Error("Title too long");
  if (input.body.length > BODY_MAX_LENGTH) throw new Error("Body too long");

  const now = new Date().toISOString();
  const metadata: NoteMetadataPlaintext = {
    title: input.title,
    categoryId: input.categoryId ?? null,
    tagIds: input.tagIds ?? [],
    answered: input.answered ?? false,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  const noteKey = await generateNoteKey();
  const encryptedMetadata = await encryptField(JSON.stringify(metadata), noteKey, {
    userId,
    resourceId: noteId,
    field: "note_metadata",
  });
  const encryptedBody = await encryptField(input.body, noteKey, {
    userId,
    resourceId: noteId,
    field: "note_body",
  });
  const encryptedWrappedNoteKey = await wrapNoteKey(userId, noteId, noteKey, vaultKey);

  return {
    encryptedMetadata,
    encryptedBody,
    encryptedWrappedNoteKey,
    bodyEncryptionVersion: ENCRYPTION_VERSION,
  };
}

export async function decryptNote(
  encryptedMetadata: EncryptedPayload,
  encryptedBody: EncryptedPayload,
  encryptedWrappedNoteKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<DecryptedNote> {
  const noteKey = await unwrapNoteKey(encryptedWrappedNoteKey, vaultKey);

  const { userId, resourceId } = encryptedWrappedNoteKey.aad;
  verifyPayloadAad(encryptedMetadata, { userId, resourceId, field: "note_metadata" });
  verifyPayloadAad(encryptedBody, { userId, resourceId, field: "note_body" });

  const metadataJson = await decryptField(encryptedMetadata, noteKey);
  const metadata = JSON.parse(metadataJson) as NoteMetadataPlaintext;
  const body = await decryptField(encryptedBody, noteKey);

  return { metadata, body };
}

export async function reencryptNoteWithUpdatedMetadata(
  userId: string,
  noteId: string,
  metadata: NoteMetadataPlaintext,
  body: string,
  existingWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<EncryptedNotePayload> {
  const noteKey = await unwrapNoteKey(existingWrappedKey, vaultKey);

  const encryptedMetadata = await encryptField(JSON.stringify(metadata), noteKey, {
    userId,
    resourceId: noteId,
    field: "note_metadata",
  });
  const encryptedBody = await encryptField(body, noteKey, {
    userId,
    resourceId: noteId,
    field: "note_body",
  });

  return {
    encryptedMetadata,
    encryptedBody,
    encryptedWrappedNoteKey: existingWrappedKey,
    bodyEncryptionVersion: ENCRYPTION_VERSION,
  };
}

export async function rotateNoteKey(
  userId: string,
  noteId: string,
  metadata: NoteMetadataPlaintext,
  body: string,
  vaultKey?: CryptoKey
): Promise<EncryptedNotePayload> {
  const noteKey = await generateAesKey();
  const encryptedMetadata = await encryptField(JSON.stringify(metadata), noteKey, {
    userId,
    resourceId: noteId,
    field: "note_metadata",
  });
  const encryptedBody = await encryptField(body, noteKey, {
    userId,
    resourceId: noteId,
    field: "note_body",
  });
  const encryptedWrappedNoteKey = await wrapNoteKey(userId, noteId, noteKey, vaultKey);

  return {
    encryptedMetadata,
    encryptedBody,
    encryptedWrappedNoteKey,
    bodyEncryptionVersion: ENCRYPTION_VERSION,
  };
}
