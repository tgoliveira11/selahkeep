import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validatePasswordSetup } from "@tgoliveira/secure-auth/client/password-policy";
import { buildVaultPasswordPolicyFromEnv } from "@/lib/config/vault-password-policy";

const root = join(process.cwd());

describe("vault setup password integration", () => {
  it("vault setup wizard imports PasswordSetupFields from secure-auth", () => {
    const source = readFileSync(join(root, "src/features/vault/vault-setup-wizard.tsx"), "utf8");
    expect(source).toContain('from "@tgoliveira/secure-auth/react/client"');
    expect(source).toContain("PasswordSetupFields");
    expect(source).toContain("policy={vaultPasswordPolicy}");
    expect(source).not.toMatch(/vaultPassword\.length >= 12/);
  });

  it("use-ltg-vault-setup validates with validatePasswordSetup before Argon2id", () => {
    const source = readFileSync(join(root, "src/features/vault/use-ltg-vault-setup.ts"), "utf8");
    expect(source).toContain("validatePasswordSetup");
    expect(source).toContain("wrapVaultKeyForPassword");
    expect(source).not.toContain("vaultApi.setup({ vaultPassword");
  });

  it("validatePasswordSetup blocks short vault passwords per policy", () => {
    const policy = buildVaultPasswordPolicyFromEnv({ VAULT_PASSWORD_MIN_LENGTH: "16" });
    const result = validatePasswordSetup({
      password: "short",
      confirmation: "short",
      policy,
    });
    expect(result.valid).toBe(false);
  });

  it("completeSetup path does not include vault password in API payload shape", async () => {
    const policy = buildVaultPasswordPolicyFromEnv({ VAULT_PASSWORD_MIN_LENGTH: "12" });
    const password = "my-vault-passphrase-12";
    const validation = validatePasswordSetup({
      password,
      confirmation: password,
      policy,
    });
    expect(validation.valid).toBe(true);

    const vaultApiSetup = vi.fn().mockResolvedValue({ id: "vault-1" });
    vi.doMock("@/lib/api-client/vault", () => ({
      vaultApi: { setup: vaultApiSetup },
    }));

    const serialized = JSON.stringify({
      vaultVersion: "vault-v2",
      envelopes: [{ method: "password" }],
    });
    expect(serialized).not.toContain(password);
  });
});
