import { describe, it, expect } from "vitest";
import { mapVaultUnlockError } from "@/features/vault/vault-unlock-errors";
import {
  PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE,
  PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE,
  PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE,
  PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE,
  PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE,
} from "@/lib/passkey/messages";

describe("mapVaultUnlockError", () => {
  it("maps vault unlock passkey errors to user-facing copy", () => {
    expect(mapVaultUnlockError(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE)).toBe(
      PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE
    );
    expect(mapVaultUnlockError(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE)).toBe(
      PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE
    );
    expect(mapVaultUnlockError(PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE)).toBe(
      PASSKEY_ACCOUNT_ONLY_FOR_SIGN_IN_MESSAGE
    );
    expect(mapVaultUnlockError(PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE)).toBe(
      PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE
    );
    expect(mapVaultUnlockError("did not return PRF output")).toBe(
      PASSKEY_UNLOCK_PRF_UNAVAILABLE_MESSAGE
    );
  });
});
