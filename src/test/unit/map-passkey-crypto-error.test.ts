import { describe, it, expect } from "vitest";
import { mapPasskeyCryptoError } from "@/lib/passkey/map-passkey-crypto-error";
import {
  PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE,
  PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE,
} from "@/lib/passkey/messages";

describe("mapPasskeyCryptoError", () => {
  it("maps Web Crypto OperationError to PRF mismatch guidance", () => {
    const error = new DOMException(
      "Data provided to an operation does not meet requirements",
      "OperationError"
    );
    expect(mapPasskeyCryptoError(error)).toBe(PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE);
  });

  it("maps AES key length import failures", () => {
    const error = new Error("AES key data must be 128 or 256 bits");
    expect(mapPasskeyCryptoError(error)).toBe(PASSKEY_UNLOCK_PRF_MISMATCH_MESSAGE);
  });

  it("maps non-extractable vault key wrap failures", () => {
    const error = new Error(
      "Cannot wrap a non-extractable vault key. Re-wrap using innerVaultKeyBlob from the current envelope, or create the first envelope immediately after createUserVaultKey()."
    );
    expect(mapPasskeyCryptoError(error)).toBe(
      PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE
    );
  });

  it("returns null for unrelated errors", () => {
    expect(mapPasskeyCryptoError(new Error("Network request failed"))).toBeNull();
  });
});
