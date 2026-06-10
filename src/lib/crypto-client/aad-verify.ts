import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export class ClientAadMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientAadMismatchError";
  }
}

type AadField = EncryptedPayload["aad"]["field"];

export function verifyPayloadAad(
  payload: EncryptedPayload,
  expected: { userId: string; resourceId: string; field: AadField }
): void {
  if (payload.aad.userId !== expected.userId) {
    throw new ClientAadMismatchError("Encrypted payload user binding mismatch");
  }
  if (payload.aad.resourceId !== expected.resourceId) {
    throw new ClientAadMismatchError("Encrypted payload resource binding mismatch");
  }
  if (payload.aad.field !== expected.field) {
    throw new ClientAadMismatchError("Encrypted payload field binding mismatch");
  }
}
