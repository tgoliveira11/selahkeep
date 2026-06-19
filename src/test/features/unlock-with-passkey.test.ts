import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockVaultWithPasskey } from "@/features/passkey/unlock-with-passkey";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";
import {
  PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE,
  PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE,
} from "@/lib/passkey/messages";

const mocks = vi.hoisted(() => ({
  runCeremony: vi.fn(),
  verifyAuth: vi.fn(),
}));

vi.mock("@/lib/passkey/vault-unlock-authenticate", () => ({
  runVaultUnlockAuthenticationCeremony: mocks.runCeremony,
  verifyVaultUnlockAuthentication: mocks.verifyAuth,
}));

vi.mock("@/lib/crypto-client/passkey-vault", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/passkey-vault")>();
  return {
    ...actual,
    unlockVaultFromPasskeyEnvelope: vi.fn(async () => generateUserVaultKey()),
  };
});

describe("unlockVaultWithPasskey", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setSessionVaultKey(null);
    mocks.runCeremony.mockResolvedValue({
      id: "vault-cred",
      clientExtensionResults: {
        prf: { results: { first: new Uint8Array(32).fill(9).buffer } },
      },
    });
    mocks.verifyAuth.mockResolvedValue({
      verified: true,
      encryptedVaultKey: { version: "enc-v1" },
    });
  });

  it("uses vault unlock ceremony and verify purpose", async () => {
    const key = await unlockVaultWithPasskey(USER_ID);
    expect(key).toBeTruthy();
    expect(mocks.runCeremony).toHaveBeenCalledWith(undefined);
    expect(mocks.verifyAuth).toHaveBeenCalled();
  });

  it("passes optional credential id to ceremony for settings test parity", async () => {
    await unlockVaultWithPasskey(USER_ID, "vault-cred");
    expect(mocks.runCeremony).toHaveBeenCalledWith("vault-cred");
  });

  it("fails before verify when no vault passkey is configured", async () => {
    mocks.runCeremony.mockRejectedValue(new Error(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE));
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow(
      PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE
    );
    expect(mocks.verifyAuth).not.toHaveBeenCalled();
  });

  it("maps missing envelope to linked error", async () => {
    mocks.verifyAuth.mockResolvedValue({ verified: true, encryptedVaultKey: null });
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow(
      PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE
    );
  });

  it("maps verify not-configured errors", async () => {
    mocks.verifyAuth.mockRejectedValue(new Error(PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE));
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow(
      PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE
    );
  });

  it("maps verify not-linked errors from server", async () => {
    mocks.verifyAuth.mockRejectedValue(new Error(PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE));
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow(
      PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE
    );
  });

  it("rethrows unexpected ceremony errors", async () => {
    mocks.runCeremony.mockRejectedValue(new Error("WebAuthn cancelled"));
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow("WebAuthn cancelled");
  });

  it("fails on new browsers without PRF output", async () => {
    const passkeyVault = await import("@/lib/crypto-client/passkey-vault");
    vi.spyOn(passkeyVault, "extractPasskeyPrfOutput").mockReturnValue(null);
    const prfError = new passkeyVault.PasskeyPrfRequiredError(
      "This passkey requires browser PRF support to unlock your vault."
    );
    vi.mocked(passkeyVault.unlockVaultFromPasskeyEnvelope).mockRejectedValueOnce(prfError);
    mocks.verifyAuth.mockResolvedValue({
      verified: true,
      encryptedVaultKey: { version: "enc-v1" },
      prfRequired: true,
    });
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow("did not return PRF output");
  });

  it("fails when decrypting the passkey envelope fails", async () => {
    const passkeyVault = await import("@/lib/crypto-client/passkey-vault");
    vi.spyOn(passkeyVault, "extractPasskeyPrfOutput").mockReturnValue(new Uint8Array(32).fill(9));
    vi.mocked(passkeyVault.unlockVaultFromPasskeyEnvelope).mockRejectedValueOnce(
      new Error("decrypt failed")
    );
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow(
      "Could not decrypt your vault with this passkey"
    );
  });
});
