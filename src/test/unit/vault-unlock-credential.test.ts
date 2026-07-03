import { describe, it, expect } from "vitest";
import { resolveActiveVaultUnlockCredentialIdFromList } from "@/lib/passkey/vault-unlock-credential";

describe("resolveActiveVaultUnlockCredentialIdFromList", () => {
  it("prefers activeEnvelopeCredentialId over passkey list heuristics", () => {
    expect(
      resolveActiveVaultUnlockCredentialIdFromList({
        activeEnvelopeCredentialId: "envelope-cred",
        passkeys: [
          { credentialId: "stale-a", vaultUnlockEnabled: true },
          { credentialId: "stale-b", vaultUnlockEnabled: true },
        ],
      })
    ).toBe("envelope-cred");
  });

  it("falls back to a single vault-unlock-enabled passkey", () => {
    expect(
      resolveActiveVaultUnlockCredentialIdFromList({
        passkeys: [
          { credentialId: "account", vaultUnlockEnabled: false },
          { credentialId: "vault-only", vaultUnlockEnabled: true },
        ],
      })
    ).toBe("vault-only");
  });

  it("uses the only listed passkey when envelope id is absent", () => {
    expect(
      resolveActiveVaultUnlockCredentialIdFromList({
        passkeys: [{ credentialId: "only-one", vaultUnlockEnabled: false }],
      })
    ).toBe("only-one");
  });

  it("returns undefined when multiple passkeys and no envelope id", () => {
    expect(
      resolveActiveVaultUnlockCredentialIdFromList({
        passkeys: [
          { credentialId: "a", vaultUnlockEnabled: true },
          { credentialId: "b", vaultUnlockEnabled: true },
        ],
      })
    ).toBeUndefined();
  });
});
