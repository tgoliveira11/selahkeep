import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";

export const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
export const LETTER_ID = "550e8400-e29b-41d4-a716-446655440001";
export const NOTE_ID = "550e8400-e29b-41d4-a716-446655440003";
export const DEVICE_ID = "660e8400-e29b-41d4-a716-446655440002";

export function encryptedPayload(
  field: EncryptedPayload["aad"]["field"] = "title",
  resourceId = LETTER_ID
): EncryptedPayload {
  return {
    version: ENCRYPTION_VERSION,
    alg: "AES-GCM",
    iv: "dGVzdC1pdg",
    ciphertext: "dGVzdC1jaXBoZXJ0ZXh0",
    aad: {
      userId: USER_ID,
      resourceId,
      field,
    },
  };
}

export function createLetterInput() {
  return {
    id: LETTER_ID,
    encryptedTitle: encryptedPayload("title"),
    encryptedBody: encryptedPayload("body"),
    encryptedLetterKey: encryptedPayload("letter_key"),
    encryptionVersion: ENCRYPTION_VERSION,
  };
}

export function createNoteInput() {
  return {
    id: NOTE_ID,
    encryptedMetadata: encryptedPayload("note_metadata", NOTE_ID),
    encryptedBody: encryptedPayload("note_body", NOTE_ID),
    encryptedWrappedNoteKey: encryptedPayload("note_key", NOTE_ID),
    bodyEncryptionVersion: ENCRYPTION_VERSION,
  };
}
