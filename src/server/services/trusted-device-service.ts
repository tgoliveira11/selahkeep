import { runInTransaction } from "@/lib/db/transaction";
import { trustedDeviceRepository } from "@/server/repositories/trusted-device-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import type { CreateTrustedDeviceInput } from "@/lib/validation/trusted-devices";
import { assertVaultKeyAad } from "@/server/policies/aad-validation";
import { checkRateLimit } from "@/server/policies/rate-limit";

export type ClientDeviceState = "active" | "revoked" | "not_registered";

export const trustedDeviceService = {
  async list(userId: string) {
    return trustedDeviceRepository.findByUserId(userId);
  },

  async getClientDeviceState(userId: string, clientDeviceId: string): Promise<ClientDeviceState> {
    const active = await trustedDeviceRepository.findActiveByClientDeviceId(userId, clientDeviceId);
    if (active) return "active";

    const revoked = await trustedDeviceRepository.findRevokedByClientDeviceId(userId, clientDeviceId);
    if (revoked) return "revoked";

    return "not_registered";
  },

  async create(userId: string, input: CreateTrustedDeviceInput) {
    const rateKey = `trusted-device-create:${userId}`;
    const rate = checkRateLimit(rateKey, 10, 60 * 60 * 1000);
    if (!rate.allowed) {
      throw new RateLimitError("Too many trusted device registrations");
    }

    assertVaultKeyAad(userId, input.encryptedVaultKey);

    const clientDeviceId =
      typeof input.devicePublicKey?.deviceId === "string"
        ? input.devicePublicKey.deviceId
        : null;
    if (clientDeviceId) {
      const existing = await trustedDeviceRepository.findActiveByClientDeviceId(
        userId,
        clientDeviceId
      );
      if (existing) {
        throw new ConflictError("This device is already registered");
      }
    }

    const activeCount = await trustedDeviceRepository.countActiveByUserId(userId);
    if (activeCount >= trustedDeviceRepository.maxDevices) {
      throw new Error("Trusted device limit reached");
    }

    return runInTransaction(async (tx) => {
      const device = await trustedDeviceRepository.create(
        {
          userId,
          deviceName: input.deviceName,
          devicePublicKey: input.devicePublicKey ?? null,
          browser: input.browser ?? null,
          platform: input.platform ?? null,
          deviceType: input.deviceType ?? null,
        },
        tx
      );

      await vaultRepository.createEnvelope(
        {
          userId,
          method: "trusted_device",
          encryptedVaultKey: input.encryptedVaultKey,
          publicMetadata: { trustedDeviceId: device.id },
        },
        tx
      );

      await auditRepository.record("trusted_device_added", userId, { deviceId: device.id }, tx);
      return device;
    });
  },

  async rename(id: string, userId: string, deviceName: string) {
    const device = await trustedDeviceRepository.findByIdForUser(id, userId);
    if (!device) throw new NotFoundError("Device not found");
    if (device.revokedAt) throw new ConflictError("Device is revoked");

    const updated = await trustedDeviceRepository.updateDeviceName(id, userId, deviceName);
    if (!updated) throw new NotFoundError("Device not found");

    await auditRepository.record("trusted_device_renamed", userId, { deviceId: id });
    return updated;
  },

  async touchLastUsed(userId: string, clientDeviceId: string) {
    const state = await this.getClientDeviceState(userId, clientDeviceId);
    if (state === "revoked") {
      return { updated: false, state };
    }
    if (state === "not_registered") {
      return { updated: false, state };
    }

    const device = await trustedDeviceRepository.findActiveByClientDeviceId(userId, clientDeviceId);
    if (!device) return { updated: false, state: "not_registered" as const };

    await trustedDeviceRepository.updateLastUsed(device.id, userId);
    return { updated: true, state: "active" as const };
  },

  async revoke(id: string, userId: string) {
    const device = await trustedDeviceRepository.findByIdForUser(id, userId);
    if (!device) throw new NotFoundError("Device not found");
    if (device.revokedAt) throw new ConflictError("Device already revoked");

    await runInTransaction(async (tx) => {
      const revoked = await trustedDeviceRepository.revoke(id, userId, tx);
      if (!revoked) throw new NotFoundError("Device not found");

      const envelopes = await vaultRepository.findActiveEnvelopesByUserId(userId);
      for (const envelope of envelopes) {
        const meta = envelope.publicMetadata as { trustedDeviceId?: string } | null;
        if (envelope.method === "trusted_device" && meta?.trustedDeviceId === id) {
          await vaultRepository.revokeEnvelope(envelope.id, userId, tx);
        }
      }

      await auditRepository.record("trusted_device_revoked", userId, { deviceId: id }, tx);
    });

    return { success: true };
  },

  async isDeviceActive(id: string, userId: string): Promise<boolean> {
    const device = await trustedDeviceRepository.findByIdForUser(id, userId);
    return device !== null && device.revokedAt === null;
  },
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
