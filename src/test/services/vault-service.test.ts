import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  vaultService,
  ConflictError,
  NotFoundError,
  RateLimitError,
} from "@/server/services/vault-service";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  createVault: vi.fn(),
  createEnvelope: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
  findActiveEnvelopeByMethod: vi.fn(),
  revokeEnvelope: vi.fn(),
  updateVaultIndex: vi.fn(),
  updateVaultSettings: vi.fn(),
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
    updateVaultIndex: mocks.updateVaultIndex,
    updateVaultSettings: mocks.updateVaultSettings,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

describe("vault service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes a new vault with recovery_code envelope", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    mocks.createVault.mockResolvedValue({ id: "vault-1" });

    const result = await vaultService.init(USER_ID, {
      vaultVersion: "vault-v1",
      envelopes: [
        {
          method: "recovery_code",
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          kdfMetadata: {
            kdf: "argon2id",
            version: "kdf-v1",
            salt: "c2FsdA",
            memory: 65536,
            iterations: 3,
            parallelism: 1,
          },
        },
      ],
    });

    expect(result.id).toBe("vault-1");
    expect(mocks.createEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ method: "recovery_code" }),
      expect.anything()
    );
    expect(mocks.record).toHaveBeenCalledWith(
      "vault_initialized",
      USER_ID,
      undefined,
      expect.anything()
    );
  });

  it("initializes vault with non-device envelopes in the same transaction", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    mocks.createVault.mockResolvedValue({ id: "vault-1" });
    mocks.createEnvelope.mockResolvedValue({ id: "env-recovery" });

    await vaultService.init(USER_ID, {
      vaultVersion: "vault-v1",
      envelopes: [
        {
          method: "recovery_code",
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          kdfMetadata: {
            kdf: "argon2id",
            version: "kdf-v1",
            salt: "c2FsdA",
            memory: 65536,
            iterations: 3,
            parallelism: 1,
          },
        },
      ],
    });

    expect(mocks.createEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ method: "recovery_code" }),
      expect.anything()
    );
  });

  it("rejects duplicate vault init", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    await expect(
      vaultService.init(USER_ID, {
        vaultVersion: "vault-v1",
        envelopes: [
          {
            method: "recovery_code",
            encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          },
        ],
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("returns not_configured when vault missing", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    await expect(vaultService.getStatus(USER_ID)).resolves.toEqual({
      initialized: false,
      hasVault: false,
      setupPhase: "not_configured",
      setupComplete: false,
    });
  });

  it("reports setup_incomplete for vault-v2 missing encrypted settings", async () => {
    mocks.findVaultByUserId.mockResolvedValue({
      vaultVersion: "vault-v2",
      encryptedVaultSettings: null,
      encryptedVaultIndex: encryptedPayload("vault_index", USER_ID),
    });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      { method: "password" },
      { method: "recovery_phrase" },
    ]);

    await expect(vaultService.getStatus(USER_ID)).resolves.toMatchObject({
      setupPhase: "setup_incomplete",
      setupComplete: false,
      ltgSetupComplete: false,
      recoveryState: undefined,
    });
  });

  it("classifies Protected recovery state", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ vaultVersion: "vault-v1" });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([
      { method: "password" },
      { method: "recovery_code" },
    ]);
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
    expect(mocks.revokeEnvelope).toHaveBeenCalledWith("env-old", USER_ID, expect.anything());
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

  it("classifies At Risk recovery state with only password", async () => {
    mocks.findVaultByUserId.mockResolvedValue({ vaultVersion: "vault-v1" });
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([{ method: "password" }]);
    await expect(vaultService.getStatus(USER_ID)).resolves.toMatchObject({
      recoveryState: "Basic",
      hasPasskey: false,
    });
  });

  it("stores first recovery code without revoking previous envelope", async () => {
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
    expect(mocks.revokeEnvelope).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(
      "recovery_code_generated",
      USER_ID,
      undefined,
      expect.anything()
    );
  });

  it("unlockWithRecoveryCode fails when no envelope", async () => {
    mocks.findActiveEnvelopeByMethod.mockResolvedValue(null);
    await expect(vaultService.unlockWithRecoveryCode(USER_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("getSettings returns encrypted vault settings", async () => {
    const settings = encryptedPayload("vault_settings", USER_ID);
    mocks.findVaultByUserId.mockResolvedValue({ encryptedVaultSettings: settings });
    await expect(vaultService.getSettings(USER_ID)).resolves.toEqual({
      encryptedVaultSettings: settings,
    });
  });

  it("updateSettings persists encrypted vault settings", async () => {
    const settings = encryptedPayload("vault_settings", USER_ID);
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.updateVaultSettings.mockResolvedValue({ encryptedVaultSettings: settings });
    await expect(vaultService.updateSettings(USER_ID, settings)).resolves.toEqual({
      encryptedVaultSettings: settings,
    });
  });

  it("getIndex returns encrypted vault index", async () => {
    const index = encryptedPayload("vault_index", USER_ID);
    mocks.findVaultByUserId.mockResolvedValue({ encryptedVaultIndex: index });
    await expect(vaultService.getIndex(USER_ID)).resolves.toEqual({
      encryptedVaultIndex: index,
    });
  });
});
