import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockVaultFromDeviceEnvelopes } from "@/lib/crypto-client/vault-unlock";
import { buildDeviceVaultEnvelope, generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";

const storage = vi.hoisted(() => ({
  localEnvelope: null as Awaited<ReturnType<typeof buildDeviceVaultEnvelope>>["encryptedVaultKey"] | null,
  deviceSecret: null as CryptoKey | null,
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

const serverEnvelopes = vi.hoisted(() => ({
  value: [] as Array<{ id: string; encryptedVaultKey: unknown; createdAt: string }>,
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

vi.mock("@/lib/crypto-client/record-device-unlock", () => ({
  recordTrustedDeviceUnlock: vi.fn(),
}));

describe("vault unlock extended paths", () => {
  beforeEach(async () => {
    storage.localEnvelope = null;
    storage.deviceSecret = null;
    serverEnvelopes.value = [];
    const { setSessionVaultKey } = await import("@/lib/crypto-client/vault");
    setSessionVaultKey(null);
  });

  it("falls back to server trusted-device envelopes", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    serverEnvelopes.value = [
      { id: "env-1", encryptedVaultKey, createdAt: "2024-01-01T00:00:00.000Z" },
    ];

    const restored = await unlockVaultFromDeviceEnvelopes(USER_ID);
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("deduplicates identical local and server envelopes", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = encryptedVaultKey;
    serverEnvelopes.value = [
      { id: "env-1", encryptedVaultKey, createdAt: "2024-01-02T00:00:00.000Z" },
    ];
    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).resolves.toBeTruthy();
  });
});
