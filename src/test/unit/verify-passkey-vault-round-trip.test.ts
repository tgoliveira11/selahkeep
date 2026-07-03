import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyPasskeyVaultUnlockRoundTrip } from "@/lib/passkey/verify-passkey-vault-round-trip";
import { PASSKEY_VAULT_UNLOCK_TEST_MISMATCH_MESSAGE } from "@/lib/passkey/messages";

const mocks = vi.hoisted(() => ({
  runCeremony: vi.fn(),
  verifyAuth: vi.fn(),
  extractPrf: vi.fn(),
  unlockEnvelope: vi.fn(),
  keysEqual: vi.fn(),
}));

vi.mock("@/lib/passkey/vault-unlock-authenticate", () => ({
  runVaultUnlockAuthenticationCeremony: mocks.runCeremony,
  verifyVaultUnlockAuthentication: mocks.verifyAuth,
}));

vi.mock("@/lib/crypto-client/passkey-vault", () => ({
  extractPasskeyPrfOutput: mocks.extractPrf,
  unlockVaultFromPasskeyEnvelope: mocks.unlockEnvelope,
}));

vi.mock("@tgoliveira/vault-core", () => ({
  userVaultKeysEqual: mocks.keysEqual,
}));

describe("verifyPasskeyVaultUnlockRoundTrip", () => {
  const sessionVaultKey = {} as CryptoKey;
  const prfOutput = new Uint8Array(32);
  const encryptedVaultKey = { version: "enc-v1" } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unlockEnvelope.mockResolvedValue({} as CryptoKey);
    mocks.keysEqual.mockResolvedValue(true);
  });

  it("skips WebAuthn when knownUnlock is provided during setup", async () => {
    await verifyPasskeyVaultUnlockRoundTrip({
      userId: "user-1",
      sessionVaultKey,
      knownUnlock: { prfOutput, encryptedVaultKey, prfRequired: true },
    });

    expect(mocks.runCeremony).not.toHaveBeenCalled();
    expect(mocks.verifyAuth).not.toHaveBeenCalled();
    expect(mocks.unlockEnvelope).toHaveBeenCalledWith(
      "user-1",
      encryptedVaultKey,
      prfOutput,
      { prfRequired: true, applySession: false }
    );
  });

  it("runs full ceremony when knownUnlock is omitted (settings Test)", async () => {
    mocks.runCeremony.mockResolvedValue({ id: "cred-1", clientExtensionResults: {} });
    mocks.extractPrf.mockReturnValue(prfOutput);
    mocks.verifyAuth.mockResolvedValue({
      verified: true,
      encryptedVaultKey,
      prfRequired: true,
    });

    await verifyPasskeyVaultUnlockRoundTrip({
      userId: "user-1",
      sessionVaultKey,
      credentialId: "cred-1",
    });

    expect(mocks.runCeremony).toHaveBeenCalledWith("cred-1");
    expect(mocks.verifyAuth).toHaveBeenCalled();
  });

  it("throws mismatch when derived key differs from session key", async () => {
    mocks.keysEqual.mockResolvedValue(false);

    await expect(
      verifyPasskeyVaultUnlockRoundTrip({
        userId: "user-1",
        sessionVaultKey,
        knownUnlock: { prfOutput, encryptedVaultKey },
      })
    ).rejects.toThrow(PASSKEY_VAULT_UNLOCK_TEST_MISMATCH_MESSAGE);
  });
});
