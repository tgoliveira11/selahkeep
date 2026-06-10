import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { stringToBytes } from "./encoding";

/** Stable key order for AAD — must match at encrypt and decrypt time. */
export function canonicalAadString(aad: EncryptedPayload["aad"]): string {
  return JSON.stringify({
    field: aad.field,
    resourceId: aad.resourceId,
    userId: aad.userId,
  });
}

/** Try every AAD byte sequence that may have been used (legacy + DB key reordering). */
export function aadByteCandidates(aad: EncryptedPayload["aad"]): Uint8Array[] {
  const variants = new Set<string>([
    canonicalAadString(aad),
    // Legacy encrypt order before canonical AAD was introduced.
    JSON.stringify({
      userId: aad.userId,
      resourceId: aad.resourceId,
      field: aad.field,
    }),
    // Whatever key order PostgreSQL/jsonb returned into the client object.
    JSON.stringify(aad),
  ]);

  return Array.from(variants).map((value) => stringToBytes(value));
}
