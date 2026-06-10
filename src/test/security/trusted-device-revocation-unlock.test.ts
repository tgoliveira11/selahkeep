import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertTrustedDeviceCanUnlock,
  RevokedTrustedDeviceError,
  unlockVaultFromDeviceEnvelopes,
} from "@/lib/crypto-client/vault-unlock";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const deviceStorageMocks = vi.hoisted(() => ({
  getOrCreateDeviceSecret: vi.fn(),
  getLocalVaultEnvelope: vi.fn(),
  storeLocalVaultEnvelope: vi.fn(),
  clearLocalVaultData: vi.fn(),
}));

const vaultMocks = vi.hoisted(() => ({
  setSessionVaultKey: vi.fn(),
  getSessionVaultKey: vi.fn(),
}));

vi.mock("@/lib/crypto-client/device-storage", () => deviceStorageMocks);
vi.mock("@/lib/crypto-client/vault", () => ({
  setSessionVaultKey: vaultMocks.setSessionVaultKey,
  getSessionVaultKey: vaultMocks.getSessionVaultKey,
}));
vi.mock("@/lib/api-client/trusted-devices", () => ({
  trustedDevicesApi: {
    deviceState: vi.fn(),
    touch: vi.fn(),
  },
}));
vi.mock("@/lib/api-client/vault", () => ({
  vaultApi: {
    deviceEnvelopes: vi.fn(async () => []),
  },
}));
vi.mock("@/lib/crypto-client/record-device-unlock", () => ({
  recordTrustedDeviceUnlock: vi.fn(),
}));

describe("trusted device revocation unlock behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deviceStorageMocks.getOrCreateDeviceSecret.mockResolvedValue({
      deviceId: "660e8400-e29b-41d4-a716-446655440002",
      deviceSecret: {} as CryptoKey,
    });
  });

  it("clears local material and blocks unlock when server reports revoked device", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "revoked" });
    deviceStorageMocks.getLocalVaultEnvelope.mockResolvedValue(
      encryptedPayload("vault_key", USER_ID)
    );

    await expect(
      assertTrustedDeviceCanUnlock(USER_ID, "660e8400-e29b-41d4-a716-446655440002")
    ).rejects.toBeInstanceOf(RevokedTrustedDeviceError);

    expect(deviceStorageMocks.clearLocalVaultData).toHaveBeenCalledWith(USER_ID);
    expect(vaultMocks.setSessionVaultKey).toHaveBeenCalledWith(null);
  });

  it("does not use local IndexedDB envelope after online revocation check", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "revoked" });
    deviceStorageMocks.getLocalVaultEnvelope.mockResolvedValue(
      encryptedPayload("vault_key", USER_ID)
    );

    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toBeInstanceOf(
      RevokedTrustedDeviceError
    );
  });

  it("allows unlock path when device is active on server", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "active" });

    await expect(
      assertTrustedDeviceCanUnlock(USER_ID, "660e8400-e29b-41d4-a716-446655440002")
    ).resolves.toBeUndefined();
    expect(deviceStorageMocks.clearLocalVaultData).not.toHaveBeenCalled();
  });
});
