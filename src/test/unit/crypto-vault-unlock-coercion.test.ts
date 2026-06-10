import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockVaultFromDeviceEnvelopes } from "@/lib/crypto-client/vault-unlock";
import { buildDeviceVaultEnvelope, generateUserVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID } from "@/test/helpers/fixtures";

const storage = vi.hoisted(() => ({
  localEnvelope: null as unknown,
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
    storage.localEnvelope = envelope;
  }),
}));

vi.mock("@/lib/api-client/vault", () => ({
  vaultApi: { deviceEnvelopes: vi.fn(async () => []) },
}));

describe("vault unlock payload coercion", () => {
  beforeEach(async () => {
    storage.localEnvelope = null;
    storage.deviceSecret = null;
    const { setSessionVaultKey } = await import("@/lib/crypto-client/vault");
    setSessionVaultKey(null);
  });

  it("accepts jsonb payloads with reordered keys", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    const reordered = {
      alg: encryptedVaultKey.alg,
      aad: {
        field: encryptedVaultKey.aad.field,
        userId: encryptedVaultKey.aad.userId,
        resourceId: encryptedVaultKey.aad.resourceId,
      },
      ciphertext: encryptedVaultKey.ciphertext,
      iv: encryptedVaultKey.iv,
      version: encryptedVaultKey.version,
    };
    storage.localEnvelope = reordered;
    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).resolves.toBeTruthy();
  });
});
