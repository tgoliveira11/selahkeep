import { describe, it, expect } from "vitest";
import { buildSecureAuthConfigFromEnv } from "@/lib/env/secure-auth-from-env";
import { buildTestPasswordPolicyFromEnv } from "@/test/helpers/secure-auth-ui-config";

const baseEnv = {
  NEXTAUTH_SECRET: "a".repeat(32),
  TWO_FACTOR_SECRET_ENCRYPTION_KEY: "b".repeat(32),
  APP_BASE_URL: "http://localhost:3001",
};

const defaults = {
  appName: "Letters to God",
  appSlug: "letters-to-god",
  baseUrl: "http://localhost:3001",
};

describe("password policy consistency", () => {
  it("maps PASSWORD_MIN_LENGTH into secure-auth server config", () => {
    const config = buildSecureAuthConfigFromEnv(
      { ...baseEnv, PASSWORD_MIN_LENGTH: "5" },
      defaults
    );
    expect(config.passwordPolicy?.minLength).toBe(5);
  });

  it("prefers AUTH_PASSWORD_MIN_LENGTH over PASSWORD_MIN_LENGTH", () => {
    const config = buildSecureAuthConfigFromEnv(
      {
        ...baseEnv,
        PASSWORD_MIN_LENGTH: "8",
        AUTH_PASSWORD_MIN_LENGTH: "10",
      },
      defaults
    );
    expect(config.passwordPolicy?.minLength).toBe(10);
  });

  it("builds the same policy for SecureAuthUIProvider test config", () => {
    const fromEnv = buildSecureAuthConfigFromEnv(
      { ...baseEnv, PASSWORD_MIN_LENGTH: "5" },
      defaults
    ).passwordPolicy;
    const fromHelper = buildTestPasswordPolicyFromEnv({ PASSWORD_MIN_LENGTH: "5" });
    expect(fromHelper).toEqual(fromEnv);
  });
});
