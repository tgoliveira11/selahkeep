import type { PasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";
import { resolvePasswordPolicy } from "@tgoliveira/secure-auth/client/password-policy";
import { readBoolEnv, readEnumEnv, readIntEnv } from "@/lib/env/parse";

/** App-owned vault password policy (separate from account auth password policy). */
export function buildVaultPasswordPolicyFromEnv(
  env: NodeJS.ProcessEnv = process.env
): PasswordPolicyConfig {
  return resolvePasswordPolicy({
    enforcement: readEnumEnv(
      env,
      "VAULT_PASSWORD_ENFORCEMENT",
      ["off", "warn", "enforce"] as const,
      "enforce"
    ),
    minLength: readIntEnv(env, "VAULT_PASSWORD_MIN_LENGTH", 16, { min: 1, max: 128 }),
    requireUppercase: readBoolEnv(env, "VAULT_PASSWORD_REQUIRE_UPPERCASE", false),
    requireLowercase: readBoolEnv(env, "VAULT_PASSWORD_REQUIRE_LOWERCASE", false),
    requireNumber: readBoolEnv(env, "VAULT_PASSWORD_REQUIRE_NUMBER", false),
    requireSymbol: readBoolEnv(env, "VAULT_PASSWORD_REQUIRE_SYMBOL", false),
    blockCommonPasswords: readBoolEnv(env, "VAULT_PASSWORD_BLOCK_COMMON_PASSWORDS", true),
    minScore: readIntEnv(env, "VAULT_PASSWORD_MIN_SCORE", 2, { min: 0, max: 4 }),
  });
}
