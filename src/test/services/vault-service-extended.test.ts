import { describe, it, expect, vi, beforeEach } from "vitest";
import { vaultService } from "@/server/services/vault-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  findActiveByUserId: vi.fn(),
  createEnvelope: vi.fn(),
  findActiveEnvelopeByMethod: vi.fn(),
  revokeEnvelope: vi.fn(),
  createVault: vi.fn(),
  countActiveByUserId: vi.fn(),
  createDevice: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findVaultByUserId: mocks.findVaultByUserId,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    findActiveEnvelopeByMethod: mocks.findActiveEnvelopeByMethod,
    revokeEnvelope: mocks.revokeEnvelope,
    createVault: mocks.createVault,
    createEnvelope: mocks.createEnvelope,
  },
}));

vi.mock("@/server/repositories/trusted-device-repository", () => ({
  trustedDeviceRepository: {
    findActiveByUserId: mocks.findActiveByUserId,
    countActiveByUserId: mocks.countActiveByUserId,
    create: mocks.createDevice,
    maxDevices: 50,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

describe("vault service extended", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns trusted device envelopes only", async () => {
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      { id: "1", method: "trusted_device", encryptedVaultKey: encryptedPayload("vault_key", USER_ID), createdAt: new Date() },
      { id: "2", method: "recovery_code", encryptedVaultKey: encryptedPayload("vault_key", USER_ID), createdAt: new Date() },
    ]);
    const envelopes = await vaultService.getTrustedDeviceEnvelopes(USER_ID);
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0].id).toBe("1");
  });

  it("classifies Basic and At Risk states", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ vaultVersion: "vault-v1" });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([{ method: "trusted_device" }]);
    mocks.findActiveByUserId.mockResolvedValue([{ id: "d1" }]);
    await expect(vaultService.getStatus(USER_ID)).resolves.toMatchObject({
      recoveryState: "Basic",
    });

    mocks.findActiveEnvelopesByUserId.mockResolvedValue([]);
    mocks.findActiveByUserId.mockResolvedValue([]);
    await expect(vaultService.getStatus(USER_ID)).resolves.toMatchObject({
      recoveryState: "At Risk",
    });
  });

  it("records first-time recovery code generation", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.findActiveEnvelopeByMethod.mockResolvedValue(null);
    mocks.createEnvelope.mockResolvedValue({ id: "env-new" });
    await vaultService.storeRecoveryCode(USER_ID, {
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
    expect(mocks.record).toHaveBeenCalledWith("recovery_code_generated", USER_ID);
  });

  it("storeRecoveryCode fails when vault missing", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    await expect(
      vaultService.storeRecoveryCode(USER_ID, {
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
        kdfMetadata: {
          kdf: "argon2id",
          version: "kdf-v1",
          salt: "c2FsdA",
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
      })
    ).rejects.toThrow("Vault not initialized");
  });
});
