import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockVaultWithPasskey } from "@/features/passkey/unlock-with-passkey";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: vi.fn(async () => ({
    id: "cred-id",
    rawId: "cred-id",
    type: "public-key",
    response: {},
    clientExtensionResults: {
      prf: { results: { first: new Uint8Array(32).fill(9).buffer } },
    },
  })),
}));

vi.mock("@/lib/api-client/client", () => ({
  apiClient: {
    post: vi.fn(),
  },
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
    const { apiClient } = await import("@/lib/api-client/client");
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ challenge: "abc" })
      .mockResolvedValueOnce({ verified: true, encryptedVaultKey: { version: "enc-v1" } });
  });

  it("authenticates and unlocks the vault", async () => {
    const key = await unlockVaultWithPasskey(USER_ID);
    expect(key).toBeTruthy();
  });

  it("fails when passkey verifies without envelope", async () => {
    const { apiClient } = await import("@/lib/api-client/client");
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ challenge: "abc" })
      .mockResolvedValueOnce({ verified: true, encryptedVaultKey: null });
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow("no vault envelope");
  });

  it("fails on new browsers without PRF output", async () => {
    const passkeyVault = await import("@/lib/crypto-client/passkey-vault");
    vi.spyOn(passkeyVault, "extractPasskeyPrfOutput").mockReturnValue(null);
    const prfError = new passkeyVault.PasskeyPrfRequiredError(
      "This passkey requires browser PRF support to unlock your vault."
    );
    vi.mocked(passkeyVault.unlockVaultFromPasskeyEnvelope).mockRejectedValueOnce(prfError);
    const { apiClient } = await import("@/lib/api-client/client");
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ challenge: "abc" })
      .mockResolvedValueOnce({
        verified: true,
        encryptedVaultKey: { version: "enc-v1" },
        prfRequired: true,
      });
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow("did not return PRF output");
  });

  it("fails when decrypting the passkey envelope fails", async () => {
    const passkeyVault = await import("@/lib/crypto-client/passkey-vault");
    vi.spyOn(passkeyVault, "extractPasskeyPrfOutput").mockReturnValue(
      new Uint8Array(32).fill(9)
    );
    vi.mocked(passkeyVault.unlockVaultFromPasskeyEnvelope).mockRejectedValueOnce(
      new Error("decrypt failed")
    );
    const { apiClient } = await import("@/lib/api-client/client");
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ challenge: "abc" })
      .mockResolvedValueOnce({
        verified: true,
        encryptedVaultKey: { version: "enc-v1" },
      });
    await expect(unlockVaultWithPasskey(USER_ID)).rejects.toThrow(
      "Could not decrypt your vault with this passkey"
    );
  });
});
