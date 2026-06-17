import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { CreateNoteInput, UpdateNoteInput } from "@/lib/validation/notes";

export class AadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AadValidationError";
  }
}

type AadField = EncryptedPayload["aad"]["field"];

export function assertPayloadAad(
  payload: EncryptedPayload,
  expected: { userId: string; resourceId: string; field: AadField }
): void {
  if (payload.aad.userId !== expected.userId) {
    throw new AadValidationError("AAD userId does not match authenticated user");
  }
  if (payload.aad.resourceId !== expected.resourceId) {
    throw new AadValidationError("AAD resourceId does not match resource");
  }
  if (payload.aad.field !== expected.field) {
    throw new AadValidationError("AAD field does not match expected field");
  }
}

export function assertVaultKeyAad(userId: string, payload: EncryptedPayload): void {
  assertPayloadAad(payload, { userId, resourceId: userId, field: "vault_key" });
}

export function assertVaultSettingsAad(userId: string, payload: EncryptedPayload): void {
  assertPayloadAad(payload, { userId, resourceId: userId, field: "vault_settings" });
}

export function assertVaultIndexAad(userId: string, payload: EncryptedPayload): void {
  assertPayloadAad(payload, { userId, resourceId: userId, field: "vault_index" });
}

export function assertNoteCreateAad(userId: string, noteId: string, input: CreateNoteInput): void {
  assertPayloadAad(input.encryptedMetadata, { userId, resourceId: noteId, field: "note_metadata" });
  assertPayloadAad(input.encryptedBody, { userId, resourceId: noteId, field: "note_body" });
  assertPayloadAad(input.encryptedWrappedNoteKey, { userId, resourceId: noteId, field: "note_key" });
}

export function assertNoteUpdateAad(userId: string, noteId: string, input: UpdateNoteInput): void {
  if (input.encryptedMetadata) {
    assertPayloadAad(input.encryptedMetadata, { userId, resourceId: noteId, field: "note_metadata" });
  }
  if (input.encryptedBody) {
    assertPayloadAad(input.encryptedBody, { userId, resourceId: noteId, field: "note_body" });
  }
  if (input.encryptedWrappedNoteKey) {
    assertPayloadAad(input.encryptedWrappedNoteKey, { userId, resourceId: noteId, field: "note_key" });
  }
}
