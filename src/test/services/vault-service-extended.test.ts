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
  updateVaultIndex: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findVaultByUserId: mocks.findVaultByUserId,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
    findActiveEnvelopeByMethod: mocks.findActiveEnvelopeByMethod,
    revokeEnvelope: mocks.revokeEnvelope,
    createVault: mocks.createVault,
    createEnvelope: mocks.createEnvelope,
    updateVaultIndex: mocks.updateVaultIndex,
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

vi.mock("@/server/policies/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
  RateLimitError: class RateLimitError extends Error {
    name = "RateLimitError";
  },
}));

describe("vault service extended", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns trusted device envelopes linked to active devices only", async () => {
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      {
        id: "1",
        method: "trusted_device",
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
        createdAt: new Date(),
        publicMetadata: { trustedDeviceId: "device-1" },
      },
      {
        id: "3",
        method: "trusted_device",
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
        createdAt: new Date(),
        publicMetadata: { trustedDeviceId: "device-revoked" },
      },
      { id: "2", method: "recovery_code", encryptedVaultKey: encryptedPayload("vault_key", USER_ID), createdAt: new Date() },
    ]);
    mocks.findActiveByUserId.mockResolvedValue([{ id: "device-1" }]);
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
      setupPhase: "setup_incomplete",
      recoveryState: undefined,
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
    expect(mocks.record).toHaveBeenCalledWith(
      "recovery_code_generated",
      USER_ID,
      undefined,
      expect.anything()
    );
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

  it("sets up LTG vault-v2 with password and recovery phrase envelopes", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    mocks.createVault.mockResolvedValue({ id: "vault-ltg" });
    const settings = encryptedPayload("vault_settings", USER_ID);
    const index = encryptedPayload("vault_index", USER_ID);
    const key = encryptedPayload("vault_key", USER_ID);
    const kdf = {
      kdf: "argon2id" as const,
      version: "kdf-v1" as const,
      salt: "c2FsdA",
      memory: 65536,
      iterations: 3,
      parallelism: 1,
    };

    const result = await vaultService.setup(USER_ID, {
      vaultVersion: "vault-v2",
      encryptedVaultSettings: settings,
      encryptedVaultIndex: index,
      envelopes: [
        { method: "password", encryptedVaultKey: key, kdfMetadata: kdf },
        { method: "recovery_phrase", encryptedVaultKey: key, kdfMetadata: kdf },
      ],
    });

    expect(result.id).toBe("vault-ltg");
    expect(mocks.createVault).toHaveBeenCalledWith(
      USER_ID,
      "vault-v2",
      expect.anything(),
      expect.objectContaining({
        encryptedVaultSettings: settings,
        encryptedVaultIndex: index,
      })
    );
    expect(mocks.createEnvelope).toHaveBeenCalledTimes(2);
  });

  it("reports ltgSetupComplete on vault-v2 status", async () => {
    mocks.findVaultByUserId.mockResolvedValue({
      vaultVersion: "vault-v2",
      encryptedVaultSettings: encryptedPayload("vault_settings", USER_ID),
      encryptedVaultIndex: encryptedPayload("vault_index", USER_ID),
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      { method: "password" },
      { method: "recovery_phrase" },
    ]);
    mocks.findActiveByUserId.mockResolvedValue([]);
    await expect(vaultService.getStatus(USER_ID)).resolves.toMatchObject({
      setupPhase: "complete",
      setupComplete: true,
      hasVault: true,
      ltgSetupComplete: true,
      hasVaultPassword: true,
      hasRecoveryPhrase: true,
      recoveryState: "Protected",
      availableUnlockMethods: {
        password: true,
        recoveryPhrase: true,
        passkey: false,
      },
    });
  });

  it("returns unlock envelope for password method", async () => {
    mocks.findActiveEnvelopeByMethod.mockResolvedValue({
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
    const envelope = await vaultService.getUnlockEnvelope(USER_ID, "password");
    expect(envelope.encryptedVaultKey).toBeDefined();
  });

  it("getIndex returns encrypted vault index", async () => {
    const index = encryptedPayload("vault_index", USER_ID);
    mocks.findVaultByUserId.mockResolvedValue({ encryptedVaultIndex: index });
    await expect(vaultService.getIndex(USER_ID)).resolves.toEqual({ encryptedVaultIndex: index });
  });

  it("updateIndex validates AAD and persists", async () => {
    const index = encryptedPayload("vault_index", USER_ID);
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.updateVaultIndex.mockResolvedValue({ encryptedVaultIndex: index });
    await expect(vaultService.updateIndex(USER_ID, index)).resolves.toEqual({
      encryptedVaultIndex: index,
    });
  });
});
