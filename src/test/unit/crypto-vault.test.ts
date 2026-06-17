import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateUserVaultKey,
  buildDeviceVaultEnvelope,
  wrapVaultKeyForRecovery,
  unwrapVaultKeyFromRecovery,
  wrapVaultKeyForDevice,
  isVaultUnlocked,
  setSessionVaultKey,
  getSessionVaultKey,
  generateDefaultNoteTitle,
} from "@/lib/crypto-client/vault";
import { generateRecoveryCode } from "@/lib/crypto-client/recovery-code";
import { USER_ID } from "@/test/helpers/fixtures";

const deviceStore = new Map<string, unknown>();

vi.mock("@/lib/crypto-client/device-storage", () => ({
  getOrCreateDeviceSecret: vi.fn(async (userId: string) => {
    const key = `secret:${userId}`;
    if (!deviceStore.has(key)) {
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const deviceSecret = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      deviceStore.set(key, { deviceId: "device-1", deviceSecret });
    }
    return deviceStore.get(key) as { deviceId: string; deviceSecret: CryptoKey };
  }),
  storeLocalVaultEnvelope: vi.fn(async () => {}),
  getLocalVaultEnvelope: vi.fn(async () => null),
  clearLocalVaultData: vi.fn(async () => deviceStore.clear()),
}));

describe("vault key lifecycle", () => {
  beforeEach(() => {
    setSessionVaultKey(null);
    deviceStore.clear();
  });

  it("tracks unlocked state in session memory", async () => {
    expect(isVaultUnlocked()).toBe(false);
    const key = await generateUserVaultKey();
    setSessionVaultKey(key);
    expect(isVaultUnlocked()).toBe(true);
    expect(getSessionVaultKey()).toBe(key);
  });

  it("builds and unwraps device envelope", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    setSessionVaultKey(null);
    const { unwrapVaultKeyFromDevice } = await import("@/lib/crypto-client/vault");
    const { vaultKey: restored } = await unwrapVaultKeyFromDevice(USER_ID, encryptedVaultKey);
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("wraps and unwraps recovery envelope", async () => {
    const vaultKey = await generateUserVaultKey();
    const code = generateRecoveryCode();
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecovery(
      vaultKey,
      code,
      USER_ID,
      USER_ID
    );
    setSessionVaultKey(null);
    const restored = await unwrapVaultKeyFromRecovery(code, encryptedVaultKey, kdfMetadata);
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("unwraps recovery envelope without explicit session unlock", async () => {
    const vaultKey = await generateUserVaultKey();
    const code = generateRecoveryCode();
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecovery(
      vaultKey,
      code,
      USER_ID,
      USER_ID
    );
    setSessionVaultKey(null);
    const restored = await unwrapVaultKeyFromRecovery(code, encryptedVaultKey, kdfMetadata, {
      explicit: false,
    });
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
    expect(isVaultUnlocked()).toBe(true);
  });

  it("wrapVaultKeyForDevice stores local envelope", async () => {
    const { storeLocalVaultEnvelope } = await import("@/lib/crypto-client/device-storage");
    const vaultKey = await generateUserVaultKey();
    await wrapVaultKeyForDevice(vaultKey, USER_ID, USER_ID);
    expect(storeLocalVaultEnvelope).toHaveBeenCalled();
  });

  it("generateDefaultNoteTitle uses readable date format", () => {
    expect(generateDefaultNoteTitle()).toMatch(/^Note from /);
  });
});
