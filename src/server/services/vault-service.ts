import { vaultRepository } from "@/server/repositories/vault-repository";
import { trustedDeviceRepository } from "@/server/repositories/trusted-device-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import type { VaultInitInput, RecoveryCodeInput } from "@/lib/validation/vault";
import { checkRateLimit } from "@/server/policies/rate-limit";

export const vaultService = {
  async init(userId: string, input: VaultInitInput) {
    const existing = await vaultRepository.findVaultByUserId(userId);
    if (existing) {
      throw new ConflictError("Vault already initialized");
    }

    const vault = await vaultRepository.createVault(userId, input.vaultVersion);

    for (const envelope of input.envelopes) {
      await vaultRepository.createEnvelope({
        userId,
        method: envelope.method,
        encryptedVaultKey: envelope.encryptedVaultKey,
        kdfMetadata: envelope.kdfMetadata ?? null,
        publicMetadata: envelope.publicMetadata ?? null,
      });

      if (envelope.method === "trusted_device" && envelope.trustedDevice) {
        const activeCount = await trustedDeviceRepository.countActiveByUserId(userId);
        if (activeCount >= trustedDeviceRepository.maxDevices) {
          throw new Error("Trusted device limit reached");
        }
        await trustedDeviceRepository.create({
          userId,
          deviceName: envelope.trustedDevice.deviceName,
          devicePublicKey: envelope.trustedDevice.devicePublicKey ?? null,
          browser: envelope.trustedDevice.browser ?? null,
          platform: envelope.trustedDevice.platform ?? null,
          deviceType: envelope.trustedDevice.deviceType ?? null,
        });
      }
    }

    await auditRepository.record("vault_initialized", userId);
    return vault;
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
    const durableMethods = ["recovery_code", "passkey_authorized_device"].filter((m) =>
      methods.has(m)
    );

    if (durableMethods.length >= 1 && (methods.size >= 2 || activeDevices.length >= 2)) {
      recoveryState = "Protected";
    } else if (activeDevices.length >= 1 || methods.has("trusted_device")) {
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
      hasPasskey: methods.has("passkey_authorized_device"),
    };
  },

  async storeRecoveryCode(userId: string, input: RecoveryCodeInput) {
    const vault = await vaultRepository.findVaultByUserId(userId);
    if (!vault) throw new NotFoundError("Vault not initialized");

    const existing = await vaultRepository.findActiveEnvelopeByMethod(userId, "recovery_code");
    if (existing) {
      await vaultRepository.revokeEnvelope(existing.id, userId);
      await auditRepository.record("recovery_code_regenerated", userId);
    } else {
      await auditRepository.record("recovery_code_generated", userId);
    }

    const envelope = await vaultRepository.createEnvelope({
      userId,
      method: "recovery_code",
      encryptedVaultKey: input.encryptedVaultKey,
      kdfMetadata: input.kdfMetadata,
    });

    return { id: envelope.id };
  },

  async getTrustedDeviceEnvelopes(userId: string) {
    const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
    return envelopes
      .filter((e) => e.method === "trusted_device")
      .map((e) => ({
        id: e.id,
        encryptedVaultKey: e.encryptedVaultKey,
        createdAt: e.createdAt,
      }));
  },

  async unlockWithRecoveryCode(userId: string) {
    const rateKey = `recovery-unlock:${userId}`;
    const rate = checkRateLimit(rateKey, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      await auditRepository.record("failed_unlock_attempt", userId, { method: "recovery_code" });
      throw new RateLimitError("Too many recovery attempts");
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

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
