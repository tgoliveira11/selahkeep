import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("two-factor security boundaries", () => {
  it("keeps TOTP outside vault crypto paths", () => {
    const vaultUnlock = readFileSync(
      join(process.cwd(), "src/lib/crypto-client/vault-unlock.ts"),
      "utf8"
    );
    const totpPolicy = readFileSync(join(process.cwd(), "src/server/policies/totp.ts"), "utf8");
    expect(vaultUnlock).not.toContain("otplib");
    expect(totpPolicy).not.toContain("User Vault Key");
    expect(totpPolicy).not.toContain("encryptedVaultKey");
  });

  it("does not expose stored TOTP secret from setup verify route", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/account/2fa/setup/start/route.ts"),
      "utf8"
    );
    expect(route).not.toContain("otpauthUrl");
  });

  it("redacts TOTP-related fields from logger", () => {
    const logger = readFileSync(join(process.cwd(), "src/lib/logger.ts"), "utf8");
    expect(logger).toContain("totpCode");
    expect(logger).toContain("backupCode");
    expect(logger).toContain("twoFactorSecret");
  });

  it("documents account-only scope in settings UI", () => {
    const settings = readFileSync(
      join(process.cwd(), "src/components/settings/two-factor-settings.tsx"),
      "utf8"
    );
    expect(settings).toContain("does not replace your private letter recovery code");
  });
});
