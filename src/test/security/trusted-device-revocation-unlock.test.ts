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
  getTrustedDeviceOfflineNotice,
} from "@/lib/crypto-client/vault-unlock";
import { buildDeviceVaultEnvelope, generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE } from "@/lib/crypto-client/trusted-device-unlock-verification";
import { ApiError } from "@/lib/api-client/api-error";
import { USER_ID } from "@/test/helpers/fixtures";

const deviceStorageMocks = vi.hoisted(() => ({
  localEnvelope: null as Awaited<ReturnType<typeof buildDeviceVaultEnvelope>>["encryptedVaultKey"] | null,
  deviceSecret: null as CryptoKey | null,
  deviceId: "660e8400-e29b-41d4-a716-446655440002",
  clearLocalVaultData: vi.fn(),
}));

const vaultMocks = vi.hoisted(() => ({
  setSessionVaultKey: vi.fn(),
  getSessionVaultKey: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  lockVaultSession: vi.fn(),
}));

vi.mock("@/lib/crypto-client/device-storage", () => ({
  getOrCreateDeviceSecret: vi.fn(async () => {
    if (!deviceStorageMocks.deviceSecret) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      deviceStorageMocks.deviceSecret = await crypto.subtle.importKey(
        "raw",
        bytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }
    return {
      deviceId: deviceStorageMocks.deviceId,
      deviceSecret: deviceStorageMocks.deviceSecret,
    };
  }),
  getLocalVaultEnvelope: vi.fn(async () => deviceStorageMocks.localEnvelope),
  storeLocalVaultEnvelope: vi.fn(async (_userId: string, _deviceId: string, envelope: unknown) => {
    deviceStorageMocks.localEnvelope = envelope as typeof deviceStorageMocks.localEnvelope;
  }),
  clearLocalVaultData: deviceStorageMocks.clearLocalVaultData,
}));
vi.mock("@/lib/crypto-client/vault-session", () => ({
  lockVaultSession: sessionMocks.lockVaultSession,
  isVaultManuallyLocked: vi.fn(() => false),
  unlockVaultSession: vi.fn(),
}));
vi.mock("@/lib/crypto-client/vault", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/vault")>();
  return {
    ...actual,
    setSessionVaultKey: vaultMocks.setSessionVaultKey,
    getSessionVaultKey: vaultMocks.getSessionVaultKey,
  };
});
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
  const clientDeviceId = deviceStorageMocks.deviceId;

  beforeEach(() => {
    vi.clearAllMocks();
    deviceStorageMocks.localEnvelope = null;
    deviceStorageMocks.deviceSecret = null;
    setSessionVaultKey(null);
  });

  it("returns verified-online when device is active on server", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "active" });

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).resolves.toEqual({
      status: "verified-online",
    });
    expect(getTrustedDeviceOfflineNotice({ status: "verified-online" })).toBeNull();
  });

  it("returns allowed-offline verification on network failure", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new TypeError("Failed to fetch"));

    const verification = await assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId);
    expect(verification).toEqual({
      status: "allowed-offline",
      message: TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE,
    });
    expect(getTrustedDeviceOfflineNotice(verification)).toBe(
      TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE
    );
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

  it("blocks unlock on HTTP 401 without offline notice", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new ApiError(401, "Unauthorized"));

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      UnauthenticatedTrustedDeviceError
    );
  });

  it("blocks unlock on HTTP 403 without offline notice", async () => {
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

  it("blocks unlock on not_registered state", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "not_registered" });

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      UnknownTrustedDeviceError
    );
  });

  it("blocks unlock on HTTP 500 without offline notice", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(
      new ApiError(500, "Internal server error")
    );

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      TrustedDeviceServerError
    );
  });

  it("fails closed on unexpected errors without offline notice", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new ApiError(418, "Teapot"));

    await expect(assertTrustedDeviceCanUnlock(USER_ID, clientDeviceId)).rejects.toBeInstanceOf(
      TrustedDeviceUnexpectedError
    );
  });

  it("surfaces offline notice when unlock succeeds after offline status check", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockRejectedValue(new TypeError("Failed to fetch"));
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    deviceStorageMocks.localEnvelope = encryptedVaultKey;

    const result = await unlockVaultFromDeviceEnvelopes(USER_ID);
    expect(result.verification.status).toBe("allowed-offline");
    expect(getTrustedDeviceOfflineNotice(result.verification)).toBe(
      TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE
    );
  });

  it("does not silently allow unlock after online revocation check", async () => {
    const { trustedDevicesApi } = await import("@/lib/api-client/trusted-devices");
    vi.mocked(trustedDevicesApi.deviceState).mockResolvedValue({ state: "revoked" });
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey } = await buildDeviceVaultEnvelope(vaultKey, USER_ID, USER_ID);
    deviceStorageMocks.localEnvelope = encryptedVaultKey;

    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toBeInstanceOf(
      RevokedTrustedDeviceError
    );
  });
});
