import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockVaultFromDeviceEnvelopes } from "@/lib/crypto-client/vault-unlock";
import { buildDeviceVaultEnvelope, generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { ApiError } from "@/lib/api-client/api-error";
import { USER_ID } from "@/test/helpers/fixtures";

const storage = vi.hoisted(() => ({
  localEnvelope: null as Awaited<ReturnType<typeof buildDeviceVaultEnvelope>>["encryptedVaultKey"] | null,
  deviceSecret: null as CryptoKey | null,
}));

const serverEnvelopes = vi.hoisted(() => ({
  value: [] as Array<{ id: string; encryptedVaultKey: unknown; createdAt: string }>,
}));

vi.mock("@/lib/crypto-client/device-storage", () => ({
  getOrCreateDeviceSecret: vi.fn(async () => {
    if (!storage.deviceSecret) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      storage.deviceSecret = await crypto.subtle.importKey(
        "raw",
        bytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }
    return { deviceId: "device-1", deviceSecret: storage.deviceSecret };
  }),
  getLocalVaultEnvelope: vi.fn(async () => storage.localEnvelope),
  storeLocalVaultEnvelope: vi.fn(async (_userId: string, _deviceId: string, envelope: unknown) => {
    storage.localEnvelope = envelope as typeof storage.localEnvelope;
  }),
}));

vi.mock("@/lib/api-client/vault", () => ({
  vaultApi: {
    deviceEnvelopes: vi.fn(async () => serverEnvelopes.value),
  },
}));

vi.mock("@/lib/api-client/trusted-devices", () => ({
  trustedDevicesApi: {
    deviceState: vi.fn(async () => ({ state: "active" as const })),
    touch: vi.fn(),
  },
}));

vi.mock("@/lib/crypto-client/vault-session", () => ({
  isVaultManuallyLocked: vi.fn(() => false),
  unlockVaultSession: vi.fn(),
  lockVaultSession: vi.fn(),
}));

vi.mock("@/lib/crypto-client/record-device-unlock", () => ({
  recordTrustedDeviceUnlock: vi.fn(),
}));

describe("vault unlock branch coverage", () => {
  beforeEach(async () => {
    storage.localEnvelope = null;
    storage.deviceSecret = null;
    serverEnvelopes.value = [];
    setSessionVaultKey(null);
    const { isVaultManuallyLocked } = await import("@/lib/crypto-client/vault-session");
    vi.mocked(isVaultManuallyLocked).mockReturnValue(false);
  });

  it("throws when vault is manually locked without explicit unlock", async () => {
    const { isVaultManuallyLocked } = await import("@/lib/crypto-client/vault-session");
    vi.mocked(isVaultManuallyLocked).mockReturnValue(true);
    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toThrow("Vault is locked");
  });

  it("unlocks with explicit option while vault is manually locked", async () => {
    const { isVaultManuallyLocked } = await import("@/lib/crypto-client/vault-session");
    vi.mocked(isVaultManuallyLocked).mockReturnValue(true);
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = encryptedVaultKey;

    const restored = (await unlockVaultFromDeviceEnvelopes(USER_ID, undefined, { explicit: true }))
      .vaultKey;
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("returns local envelopes when server fetch is offline", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    const { vaultApi } = await import("@/lib/api-client/vault");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "active" });
    vi.mocked(vaultApi.deviceEnvelopes).mockRejectedValue(new TypeError("Failed to fetch"));

    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = encryptedVaultKey;

    const result = await unlockVaultFromDeviceEnvelopes(USER_ID);
    expect(result.verification.status).toBe("verified-online");
  });

  it("throws port-mismatch guidance when only one corrupt envelope exists", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = { ...encryptedVaultKey, ciphertext: "invalid-ciphertext" };

    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toThrow(/same URL/);
  });

  it("throws recovery guidance when multiple server envelopes fail decryption", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    const corrupt = { ...encryptedVaultKey, ciphertext: "invalid-ciphertext" };
    storage.localEnvelope = corrupt;
    serverEnvelopes.value = [
      { id: "env-1", encryptedVaultKey: corrupt, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "env-2", encryptedVaultKey: { ...corrupt, iv: "another-iv-value" }, createdAt: "2024-01-02T00:00:00.000Z" },
    ];

    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toThrow(/recovery code/);
  });

  it("reuses session vault key when sample letter key already decrypts", async () => {
    const vaultKey = await generateUserVaultKey();
    setSessionVaultKey(vaultKey);
    const { encryptLetter } = await import("@/lib/crypto-client/letters");
    const { LETTER_ID } = await import("@/test/helpers/fixtures");
    const letter = await encryptLetter(USER_ID, LETTER_ID, "Title", "Body");
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = encryptedVaultKey;

    const result = await unlockVaultFromDeviceEnvelopes(USER_ID, letter.encryptedLetterKey);
    expect(result.vaultKey).toBe(vaultKey);
  });

  it("skips invalid server envelope payloads", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = encryptedVaultKey;
    serverEnvelopes.value = [
      { id: "env-bad", encryptedVaultKey: { bad: true }, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "env-good", encryptedVaultKey, createdAt: "2024-01-02T00:00:00.000Z" },
    ];

    const restored = (await unlockVaultFromDeviceEnvelopes(USER_ID)).vaultKey;
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("classifies server envelope fetch auth failures", async () => {
    const { vaultApi } = await import("@/lib/api-client/vault");
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = encryptedVaultKey;
    vi.mocked(vaultApi.deviceEnvelopes).mockRejectedValue(new ApiError(401, "Unauthorized"));

    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toMatchObject({
      name: "UnauthenticatedTrustedDeviceError",
    });
  });
});
