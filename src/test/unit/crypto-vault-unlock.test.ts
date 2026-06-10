import { describe, it, expect, vi, beforeEach } from "vitest";
import { unlockVaultFromDeviceEnvelopes } from "@/lib/crypto-client/vault-unlock";
import {
  buildDeviceVaultEnvelope,
  generateUserVaultKey,
  setSessionVaultKey,
} from "@/lib/crypto-client/vault";
import { encryptLetter } from "@/lib/crypto-client/letters";
import { USER_ID, LETTER_ID } from "@/test/helpers/fixtures";

const storage = vi.hoisted(() => ({
  localEnvelope: null as Awaited<ReturnType<typeof buildDeviceVaultEnvelope>>["encryptedVaultKey"] | null,
  deviceSecret: null as CryptoKey | null,
  deviceId: "device-1",
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
    return { deviceId: storage.deviceId, deviceSecret: storage.deviceSecret };
  }),
  getLocalVaultEnvelope: vi.fn(async () => storage.localEnvelope),
  storeLocalVaultEnvelope: vi.fn(async (_userId: string, _deviceId: string, envelope: unknown) => {
    storage.localEnvelope = envelope as typeof storage.localEnvelope;
  }),
}));

vi.mock("@/lib/api-client/vault", () => ({
  vaultApi: {
    deviceEnvelopes: vi.fn(async () => []),
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

describe("vault unlock from device envelopes", () => {
  beforeEach(async () => {
    storage.localEnvelope = null;
    storage.deviceSecret = null;
    setSessionVaultKey(null);
  });

  it("unlocks from local envelope", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    storage.localEnvelope = encryptedVaultKey;

    const restored = (await unlockVaultFromDeviceEnvelopes(USER_ID)).vaultKey;
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("selects vault key that decrypts sample letter key", async () => {
    const vaultKey = await generateUserVaultKey();
    setSessionVaultKey(vaultKey);
    const letter = await encryptLetter(USER_ID, LETTER_ID, "Title", "Body");
    const wrongKey = await generateUserVaultKey();
    const wrongEnvelope = await buildDeviceVaultEnvelope(wrongKey, USER_ID, USER_ID);
    storage.localEnvelope = wrongEnvelope.encryptedVaultKey;

    const restored = (
      await unlockVaultFromDeviceEnvelopes(USER_ID, letter.encryptedLetterKey)
    ).vaultKey;
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("throws when no envelope exists", async () => {
    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toThrow(
      "No vault envelope found"
    );
  });
});
