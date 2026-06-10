import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  trustedDeviceService,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from "@/server/services/trusted-device-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";
import { resetRateLimit } from "@/server/policies/rate-limit";

const mocks = vi.hoisted(() => ({
  findByUserId: vi.fn(),
  countActiveByUserId: vi.fn(),
  findActiveByClientDeviceId: vi.fn(),
  findRevokedByClientDeviceId: vi.fn(),
  create: vi.fn(),
  findByIdForUser: vi.fn(),
  updateDeviceName: vi.fn(),
  updateLastUsed: vi.fn(),
  revoke: vi.fn(),
  createEnvelope: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  revokeEnvelope: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/trusted-device-repository", () => ({
  trustedDeviceRepository: {
    findByUserId: mocks.findByUserId,
    countActiveByUserId: mocks.countActiveByUserId,
    findActiveByClientDeviceId: mocks.findActiveByClientDeviceId,
    findRevokedByClientDeviceId: mocks.findRevokedByClientDeviceId,
    create: mocks.create,
    findByIdForUser: mocks.findByIdForUser,
    updateDeviceName: mocks.updateDeviceName,
    updateLastUsed: mocks.updateLastUsed,
    revoke: mocks.revoke,
    maxDevices: 1,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    createEnvelope: mocks.createEnvelope,
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

describe("trusted device service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit(`trusted-device-create:${USER_ID}`);
    mocks.findActiveByClientDeviceId.mockResolvedValue(null);
  });

  it("lists trusted devices", async () => {
    mocks.findByUserId.mockResolvedValue([{ id: "device-1" }]);
    await expect(trustedDeviceService.list(USER_ID)).resolves.toEqual([{ id: "device-1" }]);
  });

  it("creates trusted device with envelope", async () => {
    mocks.countActiveByUserId.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: "device-1" });
    const device = await trustedDeviceService.create(USER_ID, {
      deviceName: "Firefox",
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
    });
    expect(device.id).toBe("device-1");
    expect(mocks.createEnvelope).toHaveBeenCalled();
  });

  it("rejects duplicate client device registration", async () => {
    mocks.findActiveByClientDeviceId.mockResolvedValue({ id: "device-existing" });
    await expect(
      trustedDeviceService.create(USER_ID, {
        deviceName: "Chrome",
        devicePublicKey: { deviceId: "same-id" },
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("renames active device", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: "device-1", revokedAt: null });
    mocks.updateDeviceName.mockResolvedValue({ id: "device-1", deviceName: "Home MacBook" });
    await expect(
      trustedDeviceService.rename("device-1", USER_ID, "Home MacBook")
    ).resolves.toEqual({ id: "device-1", deviceName: "Home MacBook" });
  });

  it("touchLastUsed updates matching device", async () => {
    mocks.findActiveByClientDeviceId.mockResolvedValue({ id: "device-1" });
    mocks.updateLastUsed.mockResolvedValue({ id: "device-1" });
    await expect(trustedDeviceService.touchLastUsed(USER_ID, "client-id")).resolves.toEqual({
      updated: true,
      state: "active",
    });
  });

  it("touchLastUsed no-ops when device is not registered", async () => {
    mocks.findActiveByClientDeviceId.mockResolvedValue(null);
    mocks.findRevokedByClientDeviceId.mockResolvedValue(null);
    await expect(trustedDeviceService.touchLastUsed(USER_ID, "missing")).resolves.toEqual({
      updated: false,
      state: "not_registered",
    });
  });

  it("touchLastUsed reports revoked device without updating", async () => {
    mocks.findActiveByClientDeviceId.mockResolvedValue(null);
    mocks.findRevokedByClientDeviceId.mockResolvedValue({ id: "device-revoked" });
    await expect(trustedDeviceService.touchLastUsed(USER_ID, "client-id")).resolves.toEqual({
      updated: false,
      state: "revoked",
    });
  });

  it("rejects when device limit reached", async () => {
    mocks.countActiveByUserId.mockResolvedValue(1);
    await expect(
      trustedDeviceService.create(USER_ID, {
        deviceName: "Firefox",
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      })
    ).rejects.toThrow("Trusted device limit reached");
  });

  it("revokes device and related envelopes", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: "device-1", revokedAt: null });
    mocks.revoke.mockResolvedValue({ id: "device-1" });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      {
        id: "env-1",
        method: "trusted_device",
        publicMetadata: { trustedDeviceId: "device-1" },
      },
    ]);
    await trustedDeviceService.revoke("device-1", USER_ID);
    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("env-1", USER_ID, expect.anything());
    expect(mocks.record).toHaveBeenCalledWith(
      "trusted_device_revoked",
      USER_ID,
      { deviceId: "device-1" },
      expect.anything()
    );
  });

  it("revoke rejects already revoked device", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: "device-1", revokedAt: new Date() });
    await expect(trustedDeviceService.revoke("device-1", USER_ID)).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("isDeviceActive returns true for active device", async () => {
    mocks.findByIdForUser.mockResolvedValue({ id: "device-1", revokedAt: null });
    await expect(trustedDeviceService.isDeviceActive("device-1", USER_ID)).resolves.toBe(true);
  });

  it("isDeviceActive returns false for missing device", async () => {
    mocks.findByIdForUser.mockResolvedValue(null);
    await expect(trustedDeviceService.isDeviceActive("device-1", USER_ID)).resolves.toBe(false);
  });

  it("rate limits device creation", async () => {
    mocks.countActiveByUserId.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: "device-1" });
    for (let i = 0; i < 10; i++) {
      await trustedDeviceService.create(USER_ID, {
        deviceName: `Device ${i}`,
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      });
    }
    await expect(
      trustedDeviceService.create(USER_ID, {
        deviceName: "One more",
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      })
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("revoke throws when device missing", async () => {
    mocks.findByIdForUser.mockResolvedValue(null);
    await expect(trustedDeviceService.revoke("missing", USER_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
