import { runInTransaction } from "@/lib/db/transaction";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { trustedDeviceRepository } from "@/server/repositories/trusted-device-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import type { VaultInitInput, RecoveryCodeInput, VaultSetupInput } from "@/lib/validation/vault";
import {
  assertVaultKeyAad,
  assertVaultSettingsAad,
  assertVaultIndexAad,
} from "@/server/policies/aad-validation";
import { enforceRateLimit, RateLimitError } from "@/server/policies/rate-limit";

export const vaultService = {
  async setup(userId: string, input: VaultSetupInput) {
    const existing = await vaultRepository.findVaultByUserId(userId);
    if (existing) {
      throw new ConflictError("Vault already initialized");
    }

    assertVaultSettingsAad(userId, input.encryptedVaultSettings);
    assertVaultIndexAad(userId, input.encryptedVaultIndex);

    const methods = new Set(input.envelopes.map((e) => e.method));
    if (!methods.has("password") || !methods.has("recovery_phrase")) {
      throw new Error("LTG vault setup requires password and recovery_phrase envelopes");
    }

    return runInTransaction(async (tx) => {
      const vault = await vaultRepository.createVault(userId, input.vaultVersion, tx, {
        encryptedVaultSettings: input.encryptedVaultSettings,
        encryptedVaultIndex: input.encryptedVaultIndex,
      });

      for (const envelope of input.envelopes) {
        assertVaultKeyAad(userId, envelope.encryptedVaultKey);
        if (envelope.kdfMetadata.kdf !== "argon2id") {
          throw new Error("LTG vault envelopes require Argon2id KDF metadata");
        }
        await vaultRepository.createEnvelope(
          {
            userId,
            method: envelope.method,
            encryptedVaultKey: envelope.encryptedVaultKey,
            kdfMetadata: envelope.kdfMetadata,
            publicMetadata: envelope.publicMetadata ?? null,
          },
          tx
        );
      }

      await auditRepository.record("vault_initialized", userId, { vaultVersion: "vault-v2" }, tx);
      return vault;
    });
  },

  async init(userId: string, input: VaultInitInput) {
    const existing = await vaultRepository.findVaultByUserId(userId);
    if (existing) {
      throw new ConflictError("Vault already initialized");
    }

    return runInTransaction(async (tx) => {
      const vault = await vaultRepository.createVault(userId, input.vaultVersion, tx);

      for (const envelope of input.envelopes) {
        assertVaultKeyAad(userId, envelope.encryptedVaultKey);

        if (envelope.method === "trusted_device" && envelope.trustedDevice) {
          const activeCount = await trustedDeviceRepository.countActiveByUserId(userId);
          if (activeCount >= trustedDeviceRepository.maxDevices) {
            throw new Error("Trusted device limit reached");
          }

          const device = await trustedDeviceRepository.create(
            {
              userId,
              deviceName: envelope.trustedDevice.deviceName,
              devicePublicKey: envelope.trustedDevice.devicePublicKey ?? null,
              browser: envelope.trustedDevice.browser ?? null,
              platform: envelope.trustedDevice.platform ?? null,
              deviceType: envelope.trustedDevice.deviceType ?? null,
            },
            tx
          );

          await vaultRepository.createEnvelope(
            {
              userId,
              method: envelope.method,
              encryptedVaultKey: envelope.encryptedVaultKey,
              kdfMetadata: envelope.kdfMetadata ?? null,
              publicMetadata: { trustedDeviceId: device.id },
            },
            tx
          );
          continue;
        }

        await vaultRepository.createEnvelope(
          {
            userId,
            method: envelope.method,
            encryptedVaultKey: envelope.encryptedVaultKey,
            kdfMetadata: envelope.kdfMetadata ?? null,
            publicMetadata: envelope.publicMetadata ?? null,
          },
          tx
        );
      }

      await auditRepository.record("vault_initialized", userId, undefined, tx);
      return vault;
    });
  },

  async getStatus(userId: string) {
    const vault = await vaultRepository.findVaultByUserId(userId);
    if (!vault) {
      return { initialized: false, recoveryState: "At Risk" as const };
    }

    const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
    const methods = new Set(envelopes.map((e) => e.method));
    const activeDevices = await trustedDeviceRepository.findActiveByUserId(userId);

    let recoveryState: "Protected" | "Basic" | "At Risk";
    const durableMethods = ["recovery_code", "recovery_phrase", "passkey_authorized_device"].filter(
      (m) => methods.has(m)
    );

    const ltgSetupComplete =
      vault.vaultVersion === "vault-v2" &&
      methods.has("password") &&
      methods.has("recovery_phrase");

    if (ltgSetupComplete || (durableMethods.length >= 1 && (methods.size >= 2 || activeDevices.length >= 2))) {
      recoveryState = "Protected";
    } else if (activeDevices.length >= 1 || methods.has("trusted_device") || methods.has("password")) {
      recoveryState = "Basic";
    } else {
      recoveryState = "At Risk";
    }

    return {
      initialized: true,
      vaultVersion: vault.vaultVersion,
      recoveryState,
      methods: Array.from(methods),
      trustedDeviceCount: activeDevices.length,
      hasRecoveryCode: methods.has("recovery_code"),
      hasRecoveryPhrase: methods.has("recovery_phrase"),
      hasVaultPassword: methods.has("password"),
      hasPasskey: methods.has("passkey_authorized_device"),
      ltgSetupComplete,
    };
  },

  async storeRecoveryCode(userId: string, input: RecoveryCodeInput) {
    const vault = await vaultRepository.findVaultByUserId(userId);
    if (!vault) throw new NotFoundError("Vault not initialized");

    assertVaultKeyAad(userId, input.encryptedVaultKey);

    return runInTransaction(async (tx) => {
      const existing = await vaultRepository.findActiveEnvelopeByMethod(userId, "recovery_code");
      if (existing) {
        await vaultRepository.revokeEnvelope(existing.id, userId, tx);
        await auditRepository.record("recovery_code_regenerated", userId, undefined, tx);
      } else {
        await auditRepository.record("recovery_code_generated", userId, undefined, tx);
      }

      const envelope = await vaultRepository.createEnvelope(
        {
          userId,
          method: "recovery_code",
          encryptedVaultKey: input.encryptedVaultKey,
          kdfMetadata: input.kdfMetadata,
        },
        tx
      );

      return { id: envelope.id };
    });
  },

  async getTrustedDeviceEnvelopes(userId: string) {
    const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
    const activeDevices = await trustedDeviceRepository.findActiveByUserId(userId);
    const activeDeviceIds = new Set(activeDevices.map((device) => device.id));

    return envelopes
      .filter((envelope) => envelope.method === "trusted_device")
      .filter((envelope) => {
        const meta = envelope.publicMetadata as { trustedDeviceId?: string } | null;
        return meta?.trustedDeviceId != null && activeDeviceIds.has(meta.trustedDeviceId);
      })
      .map((envelope) => ({
        id: envelope.id,
        encryptedVaultKey: envelope.encryptedVaultKey,
        createdAt: envelope.createdAt,
      }));
  },

  async getIndex(userId: string) {
    const vault = await vaultRepository.findVaultByUserId(userId);
    if (!vault) throw new NotFoundError("Vault not initialized");
    return { encryptedVaultIndex: vault.encryptedVaultIndex };
  },

  async updateIndex(userId: string, encryptedVaultIndex: import("@/lib/validation/encrypted-payload").EncryptedPayload) {
    const vault = await vaultRepository.findVaultByUserId(userId);
    if (!vault) throw new NotFoundError("Vault not initialized");

    assertVaultIndexAad(userId, encryptedVaultIndex);

    const updated = await vaultRepository.updateVaultIndex(userId, encryptedVaultIndex);
    if (!updated) throw new NotFoundError("Vault not initialized");
    return { encryptedVaultIndex: updated.encryptedVaultIndex };
  },

  async getSettings(userId: string) {
    const vault = await vaultRepository.findVaultByUserId(userId);
    if (!vault) throw new NotFoundError("Vault not initialized");
    return { encryptedVaultSettings: vault.encryptedVaultSettings };
  },

  async updateSettings(
    userId: string,
    encryptedVaultSettings: import("@/lib/validation/encrypted-payload").EncryptedPayload
  ) {
    const vault = await vaultRepository.findVaultByUserId(userId);
    if (!vault) throw new NotFoundError("Vault not initialized");

    assertVaultSettingsAad(userId, encryptedVaultSettings);

    const updated = await vaultRepository.updateVaultSettings(userId, encryptedVaultSettings);
    if (!updated) throw new NotFoundError("Vault not initialized");
    return { encryptedVaultSettings: updated.encryptedVaultSettings };
  },

  async getUnlockEnvelope(userId: string, method: string, ip?: string) {
    try {
      await enforceRateLimit({
        operation: "recovery.attempt",
        userId,
        ip,
        endpoint: "/api/vault/unlock-envelope",
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        await auditRepository.record("failed_unlock_attempt", userId, { method });
        throw error;
      }
      throw error;
    }

    const envelope = await vaultRepository.findActiveEnvelopeByMethod(userId, method);
    if (!envelope) {
      await auditRepository.record("failed_unlock_attempt", userId, { method });
      throw new NotFoundError(`No ${method} envelope configured`);
    }

    return {
      encryptedVaultKey: envelope.encryptedVaultKey,
      kdfMetadata: envelope.kdfMetadata,
    };
  },

  async unlockWithRecoveryCode(userId: string, ip?: string) {
    try {
      await enforceRateLimit({
        operation: "recovery.attempt",
        userId,
        ip,
        endpoint: "/api/vault/unlock-with-recovery-code",
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        await auditRepository.record("failed_unlock_attempt", userId, { method: "recovery_code" });
        throw error;
      }
      throw error;
    }

    const envelope = await vaultRepository.findActiveEnvelopeByMethod(userId, "recovery_code");
    if (!envelope) {
      await auditRepository.record("failed_unlock_attempt", userId, { method: "recovery_code" });
      throw new NotFoundError("No recovery code configured");
    }

    return {
      encryptedVaultKey: envelope.encryptedVaultKey,
      kdfMetadata: envelope.kdfMetadata,
    };
  },
};

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export { RateLimitError };
