import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const store = new Map<string, unknown>();

vi.mock("idb", () => ({
  openDB: vi.fn(async () => ({
    get: vi.fn(async (table: string, key: string) => store.get(`${table}:${key}`)),
    put: vi.fn(async (table: string, value: unknown, key: string) => {
      store.set(`${table}:${key}`, value);
    }),
    delete: vi.fn(async (table: string, key: string) => {
      store.delete(`${table}:${key}`);
    }),
  })),
}));

describe("device storage", () => {
  beforeEach(() => store.clear());

  it("creates and reuses device secrets", async () => {
    const { getOrCreateDeviceSecret } = await import("@/lib/crypto-client/device-storage");
    const first = await getOrCreateDeviceSecret(USER_ID);
    const second = await getOrCreateDeviceSecret(USER_ID);
    expect(first.deviceId).toBe(second.deviceId);
  });

  it("stores device secret as non-extractable CryptoKey", async () => {
    const { getOrCreateDeviceSecret } = await import("@/lib/crypto-client/device-storage");
    const { deviceSecret } = await getOrCreateDeviceSecret(USER_ID);
    await expect(crypto.subtle.exportKey("raw", deviceSecret)).rejects.toThrow();
  });

  it("stores and reads local vault envelopes", async () => {
    const {
      getOrCreateDeviceSecret,
      storeLocalVaultEnvelope,
      getLocalVaultEnvelope,
      clearLocalVaultData,
    } = await import("@/lib/crypto-client/device-storage");
    const { deviceId } = await getOrCreateDeviceSecret(USER_ID);
    const envelope = encryptedPayload("vault_key", USER_ID);
    await storeLocalVaultEnvelope(USER_ID, deviceId, envelope);
    await expect(getLocalVaultEnvelope(USER_ID)).resolves.toEqual(envelope);
    await clearLocalVaultData(USER_ID);
    await expect(getLocalVaultEnvelope(USER_ID)).resolves.toBeNull();
  });
});
