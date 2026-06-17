import { describe, it, expect } from "vitest";
import { buildVaultPasswordPolicyFromEnv } from "@/lib/config/vault-password-policy";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";

describe("vault password policy", () => {
  it("defaults to enforce with min length 16", () => {
    const policy = buildVaultPasswordPolicyFromEnv({});
    expect(policy.enforcement).toBe("enforce");
    expect(policy.minLength).toBe(16);
  });

  it("reads VAULT_PASSWORD_MIN_LENGTH from env", () => {
    const policy = buildVaultPasswordPolicyFromEnv({ VAULT_PASSWORD_MIN_LENGTH: "20" });
    expect(policy.minLength).toBe(20);
  });

  it("does not reuse account auth password policy env vars", () => {
    const vaultPolicy = buildVaultPasswordPolicyFromEnv({
      AUTH_PASSWORD_MIN_LENGTH: "8",
      VAULT_PASSWORD_MIN_LENGTH: "18",
    });
    const authPolicy = buildSecureAuthConfigFromEnv({
      NEXTAUTH_SECRET: "test-secret-32-chars-minimum!!",
      TWO_FACTOR_SECRET_ENCRYPTION_KEY: "test-2fa-key-32-chars-minimum!!",
      AUTH_PASSWORD_MIN_LENGTH: "8",
      VAULT_PASSWORD_MIN_LENGTH: "18",
    }).passwordPolicy;

    expect(vaultPolicy.minLength).toBe(18);
    expect(authPolicy.minLength).toBe(8);
  });
});
