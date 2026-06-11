import QRCode from "qrcode";
import { runInTransaction } from "@/lib/db/transaction";
import {
  TWO_FACTOR_BACKUP_CODE_COUNT,
  TWO_FACTOR_SESSION_UPGRADE_TTL_MS,
} from "@/lib/two-factor/constants";
import { auditRepository } from "@/server/repositories/audit-repository";
import { twoFactorRepository } from "@/server/repositories/two-factor-repository";
import { userRepository } from "@/server/repositories/user-repository";
import {
  generateBackupCodes,
  hashBackupCode,
  normalizeBackupCode,
} from "@/server/policies/backup-code";
import { createOpaqueToken, hashOpaqueToken } from "@/server/policies/login-token";
import { enforceRateLimit, RateLimitError } from "@/server/policies/rate-limit";
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  type EncryptedTwoFactorSecret,
} from "@/server/policies/two-factor-secret-crypto";
import {
  buildOtpAuthUri,
  generateTotpSecret,
  verifyTotpCode,
} from "@/server/policies/totp";

export const twoFactorService = {
  async getStatus(userId: string) {
    const settings = await twoFactorRepository.findSettingsByUserId(userId);
    return {
      enabled: settings?.enabled ?? false,
      enabledAt: settings?.enabledAt?.toISOString() ?? null,
      hasPendingSetup: Boolean(settings?.pendingSecretEncrypted),
    };
  },

  async isEnabledForUser(userId: string): Promise<boolean> {
    const settings = await twoFactorRepository.findSettingsByUserId(userId);
    return Boolean(settings?.enabled && settings.secretEncrypted);
  },

  async startSetup(userId: string, ip?: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");

    const settings = await twoFactorRepository.findSettingsByUserId(userId);
    if (settings?.enabled) {
      throw new ConflictError("Two-factor authentication is already enabled");
    }

    const secret = generateTotpSecret();
    const pendingSecretEncrypted = encryptTwoFactorSecret(secret);
    await twoFactorRepository.upsertSettings(userId, {
      enabled: false,
      pendingSecretEncrypted,
      secretEncrypted: null,
      enabledAt: null,
    });

    const otpauthUrl = buildOtpAuthUri(user.email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });

    await auditRepository.record("two_factor_setup_started", userId, {
      endpoint: "/api/account/2fa/setup/start",
    });

    return {
      qrCodeDataUrl,
      manualSetupKey: secret,
      otpauthUrl,
      issuer: "Letters to God",
      accountLabel: user.email,
    };
  },

  async verifySetup(userId: string, code: string, ip?: string) {
    await enforceRateLimit({
      operation: "two_factor.setup_verify",
      userId,
      ip,
      endpoint: "/api/account/2fa/setup/verify",
    });

    const settings = await twoFactorRepository.findSettingsByUserId(userId);
    if (!settings?.pendingSecretEncrypted) {
      throw new ValidationError("Two-factor setup has not been started");
    }
    if (settings.enabled) {
      throw new ConflictError("Two-factor authentication is already enabled");
    }

    const secret = decryptTwoFactorSecret(
      settings.pendingSecretEncrypted as EncryptedTwoFactorSecret
    );
    if (!(await verifyTotpCode(secret, code))) {
      await auditRepository.record("two_factor_setup_failed", userId, {
        endpoint: "/api/account/2fa/setup/verify",
        errorCode: "invalid_code",
      });
      throw new ValidationError("Invalid authenticator code");
    }

    const backupCodes = generateBackupCodes(TWO_FACTOR_BACKUP_CODE_COUNT);
    const backupCodeHashes = backupCodes.map((backupCode) => hashBackupCode(backupCode));

    await runInTransaction(async (tx) => {
      await twoFactorRepository.upsertSettings(
        userId,
        {
          enabled: true,
          secretEncrypted: settings.pendingSecretEncrypted as EncryptedTwoFactorSecret,
          pendingSecretEncrypted: null,
          enabledAt: new Date(),
        },
        tx
      );
      await twoFactorRepository.replaceBackupCodes(userId, backupCodeHashes, tx);
    });

    await auditRepository.record("two_factor_enabled", userId, {
      endpoint: "/api/account/2fa/setup/verify",
    });
    await auditRepository.record("two_factor_backup_codes_generated", userId, {
      endpoint: "/api/account/2fa/setup/verify",
    });

    return {
      success: true,
      backupCodes,
    };
  },

  async disable(
    userId: string,
    input: { code?: string; backupCode?: string },
    ip?: string
  ) {
    await enforceRateLimit({
      operation: "two_factor.disable",
      userId,
      ip,
      endpoint: "/api/account/2fa/disable",
    });

    const settings = await twoFactorRepository.findSettingsByUserId(userId);
    if (!settings?.enabled || !settings.secretEncrypted) {
      throw new ConflictError("Two-factor authentication is not enabled");
    }

    const verified = await twoFactorService.verifyUserCode(userId, input);
    if (!verified) {
      await auditRepository.record("two_factor_disable_failed", userId, {
        endpoint: "/api/account/2fa/disable",
        errorCode: "invalid_code",
      });
      throw new ValidationError("Invalid authenticator or backup code");
    }

    await runInTransaction(async (tx) => {
      await twoFactorRepository.deleteSettingsForUser(userId, tx);
    });

    await auditRepository.record("two_factor_disabled", userId, {
      endpoint: "/api/account/2fa/disable",
    });

    return { success: true };
  },

  async regenerateBackupCodes(userId: string, input: { code?: string; backupCode?: string }, ip?: string) {
    await enforceRateLimit({
      operation: "two_factor.backup_regenerate",
      userId,
      ip,
      endpoint: "/api/account/2fa/backup-codes/regenerate",
    });

    const settings = await twoFactorRepository.findSettingsByUserId(userId);
    if (!settings?.enabled || !settings.secretEncrypted) {
      throw new ConflictError("Two-factor authentication is not enabled");
    }

    const verified = await twoFactorService.verifyUserCode(userId, input);
    if (!verified) {
      throw new ValidationError("Invalid authenticator or backup code");
    }

    const backupCodes = generateBackupCodes(TWO_FACTOR_BACKUP_CODE_COUNT);
    const backupCodeHashes = backupCodes.map((backupCode) => hashBackupCode(backupCode));
    await twoFactorRepository.replaceBackupCodes(userId, backupCodeHashes);

    await auditRepository.record("two_factor_backup_codes_generated", userId, {
      endpoint: "/api/account/2fa/backup-codes/regenerate",
    });

    return { backupCodes };
  },

  async verifyUserCode(
    userId: string,
    input: { code?: string; backupCode?: string }
  ): Promise<"totp" | "backup" | null> {
    if (input.code) {
      const settings = await twoFactorRepository.findSettingsByUserId(userId);
      if (!settings?.secretEncrypted) return null;
      const secret = decryptTwoFactorSecret(
        settings.secretEncrypted as EncryptedTwoFactorSecret
      );
      if (await verifyTotpCode(secret, input.code)) {
        return "totp";
      }
    }

    if (input.backupCode) {
      const codeHash = hashBackupCode(input.backupCode);
      const row = await twoFactorRepository.findUnusedBackupCodeByHash(userId, codeHash);
      if (!row) return null;
      await twoFactorRepository.markBackupCodeUsed(row.id, userId);
      await auditRepository.record("two_factor_backup_code_used", userId, {
        endpoint: "/api/auth/login/verify-2fa",
        method: "backup_code",
      });
      return "backup";
    }

    return null;
  },

  async verifyLoginCode(
    userId: string,
    input: { code?: string; backupCode?: string }
  ): Promise<boolean> {
    const result = await twoFactorService.verifyUserCode(userId, input);
    return result !== null;
  },

  async createSessionUpgradeToken(userId: string) {
    const token = createOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(Date.now() + TWO_FACTOR_SESSION_UPGRADE_TTL_MS);
    await twoFactorRepository.createSessionUpgrade({ userId, tokenHash, expiresAt });
    return token;
  },

  async consumeSessionUpgradeToken(userId: string, token: string): Promise<boolean> {
    const tokenHash = hashOpaqueToken(token);
    const row = await twoFactorRepository.consumeSessionUpgrade(tokenHash, userId);
    return row !== null;
  },
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export { RateLimitError };
