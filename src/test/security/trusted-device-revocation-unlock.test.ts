import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertTrustedDeviceCanUnlock,
  RevokedTrustedDeviceError,
  UnauthenticatedTrustedDeviceError,
  ForbiddenTrustedDeviceError,
  UnknownTrustedDeviceError,
  TrustedDeviceServerError,
  TrustedDeviceUnexpectedError,
  unlockVaultFromDeviceEnvelopes,
} from "@/lib/crypto-client/vault-unlock";
import { ApiError } from "@/lib/api-client/api-error";
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

const sessionMocks = vi.hoisted(() => ({
  lockVaultSession: vi.fn(),
}));

vi.mock("@/lib/crypto-client/device-storage", () => deviceStorageMocks);
vi.mock("@/lib/crypto-client/vault-session", () => ({
  lockVaultSession: sessionMocks.lockVaultSession,
  isVaultManuallyLocked: vi.fn(() => false),
  unlockVaultSession: vi.fn(),
}));
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

describe("trusted device unlock hardening", () => {
  const clientDeviceId = "660e8400-e29b-41d4-a716-446655440002";

  beforeEach(() => {
    vi.clearAllMocks();
    deviceStorageMocks.getOrCreateDeviceSecret.mockResolvedValue({
      deviceId: clientDeviceId,
      deviceSecret: {} as CryptoKey,
    });
  });

  it("clears local material and blocks unlock when server reports revoked device", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "revoked" });

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      RevokedTrustedDeviceError
    );
    expect(deviceStorageMocks.clearLocalVaultData).toHaveBeenCalledWith(USER_ID);
    expect(sessionMocks.lockVaultSession).toHaveBeenCalled();
  });

  it("blocks unlock on HTTP 401", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new ApiError(401, "Unauthorized"));

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      UnauthenticatedTrustedDeviceError
    );
  });

  it("blocks unlock on HTTP 403", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new ApiError(403, "Forbidden"));

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      ForbiddenTrustedDeviceError
    );
  });

  it("blocks unlock on HTTP 404 and clears local material", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new ApiError(404, "Not found"));

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      UnknownTrustedDeviceError
    );
    expect(deviceStorageMocks.clearLocalVaultData).toHaveBeenCalledWith(USER_ID);
  });

  it("blocks unlock on not_registered state and clears local material", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "not_registered" });

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      UnknownTrustedDeviceError
    );
    expect(deviceStorageMocks.clearLocalVaultData).toHaveBeenCalledWith(USER_ID);
  });

  it("blocks unlock on HTTP 500", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(
      new ApiError(500, "Internal server error")
    );

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      TrustedDeviceServerError
    );
  });

  it("allows local unlock path on real network failure", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new TypeError("Failed to fetch"));
    deviceStorageMocks.getLocalVaultEnvelope.mockResolvedValue(
      encryptedPayload("vault_key", USER_ID)
    );

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).resolves.toBeUndefined();
  });

  it("fails closed on unexpected errors", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new ApiError(418, "Teapot"));

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      TrustedDeviceUnexpectedError
    );
  });

  it("does not silently allow unlock after online revocation check", async () => {
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

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).resolves.toBeUndefined();
    expect(deviceStorageMocks.clearLocalVaultData).not.toHaveBeenCalled();
  });
});
