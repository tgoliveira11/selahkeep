import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordTrustedDeviceUnlock } from "@/lib/crypto-client/record-device-unlock";
import { USER_ID } from "@/test/helpers/fixtures";

vi.mock("@/lib/crypto-client/device-storage", () => ({
  getOrCreateDeviceSecret: vi.fn(async () => ({ deviceId: "device-1", deviceSecret: {} as CryptoKey })),
  clearLocalVaultData: vi.fn(),
}));

vi.mock("@/lib/crypto-client/vault-session", () => ({
  lockVaultSession: vi.fn(),
}));

vi.mock("@/lib/api-client/trusted-devices", () => ({
  trustedDevicesApi: {
    touch: vi.fn(),
  },
}));

describe("recordTrustedDeviceUnlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears local vault data when server reports revoked device", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    const { clearLocalVaultData } = await import("@/lib/crypto-client/device-storage");
    const { lockVaultSession } = await import("@/lib/crypto-client/vault-session");
    vi.mocked(trustedDevicesApi.touch).mockResolvedValue({ updated: true, state: "revoked" });

    await recordTrustedDeviceUnlock(USER_ID);
    expect(clearLocalVaultData).toHaveBeenCalledWith(USER_ID);
    expect(lockVaultSession).toHaveBeenCalled();
  });

  it("ignores touch failures for offline or unregistered devices", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.touch).mockRejectedValue(new Error("offline"));

    await expect(recordTrustedDeviceUnlock(USER_ID)).resolves.toBeUndefined();
  });
});
