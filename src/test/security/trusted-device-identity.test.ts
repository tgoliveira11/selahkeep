import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  trustedDeviceService,
  ConflictError,
} from "@/server/services/trusted-device-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";
import { isCurrentTrustedDevice } from "@/lib/trusted-device-utils";
import type { TrustedDeviceResponse } from "@/lib/api-client/trusted-devices";

const mocks = vi.hoisted(() => ({
  findActiveByClientDeviceId: vi.fn(),
  findRevokedByClientDeviceId: vi.fn(),
  countActiveByUserId: vi.fn(),
  create: vi.fn(),
  findByIdForUser: vi.fn(),
  revoke: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  revokeEnvelope: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/trusted-device-repository", () => ({
  trustedDeviceRepository: {
    findActiveByClientDeviceId: mocks.findActiveByClientDeviceId,
    findRevokedByClientDeviceId: mocks.findRevokedByClientDeviceId,
    countActiveByUserId: mocks.countActiveByUserId,
    create: mocks.create,
    findByIdForUser: mocks.findByIdForUser,
    revoke: mocks.revoke,
    maxDevices: 50,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    createEnvelope: vi.fn(),
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    revokeEnvelope: mocks.revokeEnvelope,
  },
}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

const NORMAL_UUID = "11111111-1111-4111-8111-111111111111";
const INCOGNITO_UUID = "22222222-2222-4222-8222-222222222222";

function activeDevice(
  id: string,
  clientDeviceId: string,
  deviceName: string
): TrustedDeviceResponse {
  return {
    id,
    userId: USER_ID,
    deviceName,
    clientDeviceId,
    devicePublicKey: { deviceId: clientDeviceId },
    browser: "Chrome",
    platform: "macOS",
    deviceType: "desktop",
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };
}

describe("trusted device identity model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countActiveByUserId.mockResolvedValue(1);
  });

  it("treats different clientDeviceId profiles as separate even with identical metadata", async () => {
    const normalDevice = activeDevice("device-normal", NORMAL_UUID, "Chrome on macOS");
    mocks.findActiveByClientDeviceId.mockImplementation(async (_userId, clientDeviceId) => {
      if (clientDeviceId === NORMAL_UUID) return normalDevice;
      return null;
    });

    const incognitoState = await trustedDeviceService.getClientDeviceState(USER_ID, INCOGNITO_UUID);
    expect(incognitoState).toEqual({ state: "not_registered" });
    expect(isCurrentTrustedDevice(normalDevice, INCOGNITO_UUID)).toBe(false);

    mocks.create.mockResolvedValue(
      activeDevice("device-incognito", INCOGNITO_UUID, "Chrome on macOS (private)")
    );

    const created = await trustedDeviceService.create(USER_ID, {
      deviceName: "Chrome on macOS (private)",
      devicePublicKey: { deviceId: INCOGNITO_UUID },
      browser: "Chrome",
      platform: "macOS",
      deviceType: "desktop",
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
    });

    expect(created.clientDeviceId).toBe(INCOGNITO_UUID);
    expect(mocks.create).toHaveBeenCalled();
  });

  it("returns existing active row idempotently for the same clientDeviceId", async () => {
    const existing = activeDevice("device-normal", NORMAL_UUID, "Chrome on macOS");
    mocks.findActiveByClientDeviceId.mockResolvedValue(existing);

    const result = await trustedDeviceService.create(USER_ID, {
      deviceName: "Duplicate attempt",
      devicePublicKey: { deviceId: NORMAL_UUID },
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
    });

    expect(result).toEqual(existing);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps revocation isolated per clientDeviceId profile", async () => {
    const normalDevice = activeDevice("device-normal", NORMAL_UUID, "Chrome on macOS");
    const incognitoDevice = activeDevice("device-incognito", INCOGNITO_UUID, "Chrome private");

    mocks.findByIdForUser.mockResolvedValueOnce(normalDevice);
    mocks.revoke.mockResolvedValue({ id: normalDevice.id });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      {
        id: "env-normal",
        method: "trusted_device",
        publicMetadata: { trustedDeviceId: normalDevice.id },
      },
      {
        id: "env-incognito",
        method: "trusted_device",
        publicMetadata: { trustedDeviceId: incognitoDevice.id },
      },
    ]);

    await trustedDeviceService.revoke(normalDevice.id, USER_ID);

    expect(mocks.revokeEnvelope).toHaveBeenCalledTimes(1);
    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("env-normal", USER_ID, expect.anything());

    mocks.findActiveByClientDeviceId.mockImplementation(async (_userId, clientDeviceId) => {
      if (clientDeviceId === INCOGNITO_UUID) return incognitoDevice;
      return null;
    });

    await expect(trustedDeviceService.getClientDeviceState(USER_ID, INCOGNITO_UUID)).resolves.toEqual({
      state: "active",
      trustedDeviceId: incognitoDevice.id,
    });
  });

  it("rejects removing active devices", async () => {
    mocks.findByIdForUser.mockResolvedValue(activeDevice("device-normal", NORMAL_UUID, "Chrome"));
    await expect(trustedDeviceService.removeRevoked("device-normal", USER_ID)).rejects.toBeInstanceOf(
      ConflictError
    );
  });
});

describe("trusted device auto-relink guard", () => {
  const forbiddenPatterns = [
    /findActiveDeviceWithMatchingMetadata/,
    /findActiveDevicesWithMatchingMetadata/,
    /relinkBrowserToDevice/,
    /trustedDevicesApi\.relink/,
    /relinkClientDevice/,
    /\/relink/,
    /auto-relink/i,
  ];

  const watchedFiles = [
    "src/app/(vault)/vault/devices/page.tsx",
    "src/lib/trusted-device-utils.ts",
    "src/server/services/trusted-device-service.ts",
    "src/lib/api-client/trusted-devices.ts",
  ];

  it("does not reintroduce metadata-based auto-relink in trusted-device client/server code", () => {
    for (const relativePath of watchedFiles) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(source, `${relativePath} must not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
