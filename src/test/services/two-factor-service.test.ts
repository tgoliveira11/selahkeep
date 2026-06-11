import { describe, it, expect, vi, beforeEach } from "vitest";
import { generate, generateSecret } from "otplib";
import { encryptTwoFactorSecret } from "@/server/policies/two-factor-secret-crypto";
import { hashBackupCode } from "@/server/policies/backup-code";
import {
  twoFactorService,
  ConflictError,
  ValidationError,
} from "@/server/services/two-factor-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findSettingsByUserId: vi.fn(),
  upsertSettings: vi.fn(),
  replaceBackupCodes: vi.fn(),
  deleteSettingsForUser: vi.fn(),
  findUnusedBackupCodeByHash: vi.fn(),
  markBackupCodeUsed: vi.fn(),
  createSessionUpgrade: vi.fn(),
  consumeSessionUpgrade: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findById: mocks.findById },
}));

vi.mock("@/server/repositories/two-factor-repository", () => ({
  twoFactorRepository: {
    findSettingsByUserId: mocks.findSettingsByUserId,
    upsertSettings: mocks.upsertSettings,
    replaceBackupCodes: mocks.replaceBackupCodes,
    deleteSettingsForUser: mocks.deleteSettingsForUser,
    findUnusedBackupCodeByHash: mocks.findUnusedBackupCodeByHash,
    markBackupCodeUsed: mocks.markBackupCodeUsed,
    createSessionUpgrade: mocks.createSessionUpgrade,
    consumeSessionUpgrade: mocks.consumeSessionUpgrade,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,abc") },
}));

describe("two-factor service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findById.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
    mocks.findSettingsByUserId.mockResolvedValue(null);
    mocks.upsertSettings.mockResolvedValue({ id: "settings-1", enabled: false });
  });

  it("returns disabled status by default", async () => {
    await expect(twoFactorService.getStatus(USER_ID)).resolves.toEqual({
      enabled: false,
      enabledAt: null,
      hasPendingSetup: false,
    });
  });

  it("starts setup without enabling 2FA", async () => {
    const setup = await twoFactorService.startSetup(USER_ID);
    expect(setup.manualSetupKey).toBeTruthy();
    expect(setup.qrCodeDataUrl).toContain("data:image/png");
    expect(mocks.upsertSettings).toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(
      "two_factor_setup_started",
      USER_ID,
      expect.any(Object)
    );
  });

  it("rejects setup verify with invalid code", async () => {
    const secret = generateSecret();
    mocks.findSettingsByUserId.mockResolvedValue({
      enabled: false,
      pendingSecretEncrypted: encryptTwoFactorSecret(secret),
    });

    await expect(twoFactorService.verifySetup(USER_ID, "000000")).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("rejects disable when 2FA is not enabled", async () => {
    mocks.findSettingsByUserId.mockResolvedValue({ enabled: false, secretEncrypted: null });
    await expect(twoFactorService.disable(USER_ID, { code: "123456" })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("enables 2FA after valid setup verification", async () => {
    const secret = generateSecret();
    const code = await generate({ secret });
    mocks.findSettingsByUserId.mockResolvedValue({
      enabled: false,
      pendingSecretEncrypted: encryptTwoFactorSecret(secret),
    });

    const result = await twoFactorService.verifySetup(USER_ID, code);
    expect(result.success).toBe(true);
    expect(result.backupCodes).toHaveLength(10);
    expect(mocks.replaceBackupCodes).toHaveBeenCalled();
  });

  it("disables 2FA with a valid TOTP code", async () => {
    const secret = generateSecret();
    const code = await generate({ secret });
    mocks.findSettingsByUserId.mockResolvedValue({
      enabled: true,
      secretEncrypted: encryptTwoFactorSecret(secret),
    });

    await expect(twoFactorService.disable(USER_ID, { code })).resolves.toEqual({ success: true });
    expect(mocks.deleteSettingsForUser).toHaveBeenCalled();
  });

  it("verifies login with backup code once", async () => {
    const backupCode = "AAAA-BBBB-CCCC";
    mocks.findUnusedBackupCodeByHash.mockResolvedValue({ id: "backup-1" });
    await expect(
      twoFactorService.verifyLoginCode(USER_ID, { backupCode })
    ).resolves.toBe(true);
    expect(mocks.markBackupCodeUsed).toHaveBeenCalledWith("backup-1", USER_ID);
    expect(hashBackupCode(backupCode)).toBeTruthy();
  });

  it("regenerates backup codes when verified", async () => {
    const secret = generateSecret();
    const code = await generate({ secret });
    mocks.findSettingsByUserId.mockResolvedValue({
      enabled: true,
      secretEncrypted: encryptTwoFactorSecret(secret),
    });

    const result = await twoFactorService.regenerateBackupCodes(USER_ID, { code });
    expect(result.backupCodes).toHaveLength(10);
  });

  it("tracks enabled state", async () => {
    mocks.findSettingsByUserId.mockResolvedValue({
      enabled: true,
      secretEncrypted: encryptTwoFactorSecret(generateSecret()),
      enabledAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await expect(twoFactorService.isEnabledForUser(USER_ID)).resolves.toBe(true);
    await expect(twoFactorService.getStatus(USER_ID)).resolves.toMatchObject({
      enabled: true,
      hasPendingSetup: false,
    });
  });

  it("rejects setup when already enabled", async () => {
    mocks.findSettingsByUserId.mockResolvedValue({
      enabled: true,
      secretEncrypted: encryptTwoFactorSecret(generateSecret()),
    });
    await expect(twoFactorService.startSetup(USER_ID)).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects disable with invalid code", async () => {
    const secret = generateSecret();
    mocks.findSettingsByUserId.mockResolvedValue({
      enabled: true,
      secretEncrypted: encryptTwoFactorSecret(secret),
    });
    await expect(twoFactorService.disable(USER_ID, { code: "000000" })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  it("creates and consumes session upgrade tokens", async () => {
    mocks.createSessionUpgrade.mockResolvedValue({ id: "upgrade-1" });
    mocks.consumeSessionUpgrade.mockResolvedValue({ id: "upgrade-1" });
    const token = await twoFactorService.createSessionUpgradeToken(USER_ID);
    expect(token).toBeTruthy();
    await expect(twoFactorService.consumeSessionUpgradeToken(USER_ID, token)).resolves.toBe(true);
  });
});
