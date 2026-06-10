import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  vaultService,
  ConflictError,
  NotFoundError,
  RateLimitError,
} from "@/server/services/vault-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";
import { resetRateLimit } from "@/server/policies/rate-limit";

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  createVault: vi.fn(),
  createEnvelope: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  findActiveEnvelopeByMethod: vi.fn(),
  revokeEnvelope: vi.fn(),
  countActiveByUserId: vi.fn(),
  findActiveByUserId: vi.fn(),
  createDevice: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findVaultByUserId: mocks.findVaultByUserId,
    createVault: mocks.createVault,
    createEnvelope: mocks.createEnvelope,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    findActiveEnvelopeByMethod: mocks.findActiveEnvelopeByMethod,
    revokeEnvelope: mocks.revokeEnvelope,
  },
}));

vi.mock("@/server/repositories/trusted-device-repository", () => ({
  trustedDeviceRepository: {
    countActiveByUserId: mocks.countActiveByUserId,
    findActiveByUserId: mocks.findActiveByUserId,
    create: mocks.createDevice,
    maxDevices: 50,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

describe("vault service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit(`recovery-unlock:${USER_ID}`);
  });

  it("initializes a new vault", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    mocks.createVault.mockResolvedValue({ id: "vault-1" });
    mocks.countActiveByUserId.mockResolvedValue(0);
    mocks.createDevice.mockResolvedValue({ id: "device-1" });

    const result = await vaultService.init(USER_ID, {
      vaultVersion: "vault-v1",
      envelopes: [
        {
          method: "trusted_device",
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          trustedDevice: { deviceName: "Chrome" },
        },
      ],
    });

    expect(result.id).toBe("vault-1");
    expect(mocks.record).toHaveBeenCalledWith("vault_initialized", USER_ID);
  });

  it("rejects trusted device limit during init", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    mocks.createVault.mockResolvedValue({ id: "vault-1" });
    mocks.countActiveByUserId.mockResolvedValue(50);

    await expect(
      vaultService.init(USER_ID, {
        vaultVersion: "vault-v1",
        envelopes: [
          {
            method: "trusted_device",
            encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
            trustedDevice: { deviceName: "Chrome" },
          },
        ],
      })
    ).rejects.toThrow("Trusted device limit reached");
  });

  it("rejects duplicate vault init", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    await expect(
      vaultService.init(USER_ID, {
        vaultVersion: "vault-v1",
        envelopes: [
          {
            method: "trusted_device",
            encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          },
        ],
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("returns At Risk when vault missing", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    await expect(vaultService.getStatus(USER_ID)).resolves.toEqual({
      initialized: false,
      recoveryState: "At Risk",
    });
  });

  it("classifies Protected recovery state", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ vaultVersion: "vault-v1" });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      { method: "trusted_device" },
      { method: "recovery_code" },
    ]);
    mocks.findActiveByUserId.mockResolvedValue([{ id: "d1" }]);
    const status = await vaultService.getStatus(USER_ID);
    expect(status.recoveryState).toBe("Protected");
    expect(status.hasRecoveryCode).toBe(true);
  });

  it("stores recovery code and revokes previous envelope", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.findActiveEnvelopeByMethod.mockResolvedValue({ id: "env-old" });
    mocks.createEnvelope.mockResolvedValue({ id: "env-new" });

    const result = await vaultService.storeRecoveryCode(USER_ID, {
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      kdfMetadata: {
        kdf: "argon2id",
        version: "kdf-v1",
        salt: "c2FsdA",
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      },
    });

    expect(result.id).toBe("env-new");
    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("env-old", USER_ID);
  });

  it("unlockWithRecoveryCode rate limits attempts", async () => {
    mocks.findActiveEnvelopeByMethod.mockResolvedValue({
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      kdfMetadata: {},
    });
    for (let i = 0; i < 5; i++) {
      await vaultService.unlockWithRecoveryCode(USER_ID);
    }
    await expect(vaultService.unlockWithRecoveryCode(USER_ID)).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it("unlockWithRecoveryCode fails when no envelope", async () => {
    mocks.findActiveEnvelopeByMethod.mockResolvedValue(null);
    await expect(vaultService.unlockWithRecoveryCode(USER_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
