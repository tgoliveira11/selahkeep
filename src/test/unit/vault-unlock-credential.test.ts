import { describe, it, expect } from "vitest";
import { resolveActiveVaultUnlockCredentialIdFromList } from "@/lib/passkey/vault-unlock-credential";

describe("resolveActiveVaultUnlockCredentialIdFromList", () => {
  it("prefers currentDeviceCredentialId from server device binding", () => {
    expect(
      resolveActiveVaultUnlockCredentialIdFromList({
        passkeys: [
          { credentialId: "vault-a", vaultUnlockEnabled: true },
          { credentialId: "vault-b", vaultUnlockEnabled: true },
        ],
        currentDeviceCredentialId: "vault-b",
      })
    ).toBe("vault-b");
  });

  it("falls back to single enabled passkey when no binding", () => {
    expect(
      resolveActiveVaultUnlockCredentialIdFromList({
        passkeys: [{ credentialId: "vault-a", vaultUnlockEnabled: true }],
      })
    ).toBe("vault-a");
  });

  it("returns undefined when multiple passkeys and no binding", () => {
    expect(
      resolveActiveVaultUnlockCredentialIdFromList({
        passkeys: [
          { credentialId: "vault-a", vaultUnlockEnabled: true },
          { credentialId: "vault-b", vaultUnlockEnabled: true },
        ],
      })
    ).toBeUndefined();
  });
});
