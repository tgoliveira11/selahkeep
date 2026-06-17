import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { CreateLetterInput, UpdateLetterInput } from "@/lib/validation/letters";

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

export function assertLetterCreateAad(userId: string, letterId: string, input: CreateLetterInput): void {
  assertPayloadAad(input.encryptedTitle, { userId, resourceId: letterId, field: "title" });
  assertPayloadAad(input.encryptedBody, { userId, resourceId: letterId, field: "body" });
  assertPayloadAad(input.encryptedLetterKey, { userId, resourceId: letterId, field: "letter_key" });
}

export function assertLetterUpdateAad(
  userId: string,
  letterId: string,
  input: UpdateLetterInput
): void {
  if (input.encryptedTitle) {
    assertPayloadAad(input.encryptedTitle, { userId, resourceId: letterId, field: "title" });
  }
  if (input.encryptedBody) {
    assertPayloadAad(input.encryptedBody, { userId, resourceId: letterId, field: "body" });
  }
  if (input.encryptedLetterKey) {
    assertPayloadAad(input.encryptedLetterKey, { userId, resourceId: letterId, field: "letter_key" });
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
