import "server-only";

import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

function base64UrlDecodedByteLength(base64url: string): number {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").byteLength;
}

/** Server-side ciphertext size for quota enforcement (ignores client-reported bytes). */
export function encryptedPayloadCiphertextBytes(payload: EncryptedPayload): number {
  return (
    base64UrlDecodedByteLength(payload.ciphertext) + base64UrlDecodedByteLength(payload.iv)
  );
}

export function sumEncryptedPayloadCiphertextBytes(payloads: EncryptedPayload[]): number {
  return payloads.reduce((total, payload) => total + encryptedPayloadCiphertextBytes(payload), 0);
}
