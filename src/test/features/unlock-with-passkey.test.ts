import { lockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockVaultWithPasskey } from "@/features/passkey/unlock-with-passkey";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";
import {
  PASSKEY_NOT_LINKED_TO_VAULT_UNLOCK_MESSAGE,
  PASSKEY_VAULT_UNLOCK_NOT_CONFIGURED_MESSAGE,
} from "@/lib/passkey/messages";

const mocks = vi.hoisted(() => ({
  runCeremony: vi.fn(),
  runCeremonyWithOptions: vi.fn(),
  verifyAuth: vi.fn(),
}));

vi.mock("@/lib/passkey/vault-unlock-credential", () => ({
  resolveActiveVaultUnlockCredentialId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/passkey/vault-unlock-authenticate", () => ({
  runVaultUnlockAuthenticationCeremony: mocks.runCeremony,
  runVaultUnlockAuthenticationCeremonyWithOptions: mocks.runCeremonyWithOptions,
  verifyVaultUnlockAuthentication: mocks.verifyAuth,
}));

vi.mock("@/lib/crypto-client/passkey-vault", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/passkey-vault")>();
  return {
    ...actual,
    extractPasskeyPrfOutput: vi.fn(() => new Uint8Array(32).fill(9)),
    unlockVaultFromPasskeyEnvelope: vi.fn(async () => generateUserVaultKey()),
  };
});

describe("unlockVaultWithPasskey", () => {
  beforeEach(async () => {
    mocks.runCeremony.mockClear();
    mocks.runCeremonyWithOptions.mockClear();
    mocks.verifyAuth.mockClear();
    lockVaultSession();
    const passkeyVault = await import("@/lib/crypto-client/passkey-vault");
    vi.mocked(passkeyVault.extractPasskeyPrfOutput).mockReturnValue(new Uint8Array(32).fill(9));
    vi.mocked(passkeyVault.unlockVaultFromPasskeyEnvelope).mockImplementation(async () =>
      generateUserVaultKey()
    );
    mocks.runCeremony.mockResolvedValue({
      id: "vault-cred",
      clientExtensionResults: {
        prf: { results: { first: new Uint8Array(32).fill(9).buffer } },
      },
    });
    mocks.runCeremonyWithOptions.mockResolvedValue({
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

  it("uses prefetched options without fetching again during the tap gesture", async () => {
    const prefetched = {
      challenge: "prefetched",
      allowCredentials: [{ id: "vault-cred", type: "public-key" as const, transports: ["internal"] }],
    };
    await unlockVaultWithPasskey(USER_ID, undefined, prefetched);
    expect(mocks.runCeremony).not.toHaveBeenCalled();
    expect(mocks.runCeremonyWithOptions).toHaveBeenCalledWith(prefetched, undefined);
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
    vi.mocked(passkeyVault.extractPasskeyPrfOutput).mockReturnValue(null);
    mocks.verifyAuth.mockResolvedValue({
      verified: true,
      encryptedVaultKey: { version: "enc-v1" },
      prfRequired: true,
    });
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow("did not return PRF output");
  });

  it("fails when decrypting the passkey envelope fails", async () => {
    const passkeyVault = await import("@/lib/crypto-client/passkey-vault");
    vi.mocked(passkeyVault.extractPasskeyPrfOutput).mockReturnValue(new Uint8Array(32).fill(9));
    vi.mocked(passkeyVault.unlockVaultFromPasskeyEnvelope).mockRejectedValueOnce(
      new passkeyVault.PasskeyUnlockError("Could not decrypt")
    );
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow(
      "completed vault unlock authentication"
    );
  });

  it("uses an iOS version message when decrypt fails on iPhone iOS before 18", async () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.7 Mobile/15E148 Safari/604.1",
    });
    const passkeyVault = await import("@/lib/crypto-client/passkey-vault");
    vi.mocked(passkeyVault.unlockVaultFromPasskeyEnvelope).mockRejectedValueOnce(
      new passkeyVault.PasskeyUnlockError("Could not decrypt")
    );
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow("iOS or iPadOS 18 or later");
    vi.unstubAllGlobals();
  });
});
