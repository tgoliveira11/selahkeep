import type { SecureAuthConfig } from "@tgoliveira/secure-auth";
import type { SecureAuthUIPublicConfig } from "@tgoliveira/secure-auth/react";
import { authPageMessages } from "@/lib/auth/auth-page-messages";
import {
  readBoolEnv,
  readEnumEnv,
  readEnv,
  readEnvWithLegacy,
  readIntEnv,
} from "@/lib/env/parse";

export type SecureAuthEnvSlice = Pick<
  SecureAuthConfig,
  "app" | "auth" | "accountPolicy" | "passwordPolicy" | "sessions" | "rateLimit" | "server" | "debug" | "oauth" | "webauthn" | "ui"
>;

const PRODUCT_DEFAULTS = {
  appName: "Letters to God",
  appSlug: "letters-to-god",
  baseUrl: "http://localhost:3001",
} as const;

function parseSecureAuthEnv(
  env: NodeJS.ProcessEnv,
  defaults: { appName: string; appSlug: string; baseUrl: string }
) {
  const appName = readEnv(env, "APP_NAME") ?? defaults.appName;
  const appSlug = readEnv(env, "APP_SLUG") ?? defaults.appSlug;
  const baseUrl =
    readEnvWithLegacy(env, "APP_BASE_URL", "NEXTAUTH_URL") ?? defaults.baseUrl;

  const nextAuthSecret = readEnv(env, "NEXTAUTH_SECRET");
  const twoFactorEncryptionKey = readEnv(env, "TWO_FACTOR_SECRET_ENCRYPTION_KEY");

  const afterLoginPath = readEnv(env, "AUTH_AFTER_LOGIN_PATH") ?? "/letters";
  const afterLogoutPath = readEnv(env, "AUTH_AFTER_LOGOUT_PATH") ?? "/login";

  const requireEmailVerificationBeforeSignIn = readBoolEnv(
    env,
    "EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN",
    readBoolEnv(env, "AUTH_REQUIRE_EMAIL_VERIFICATION_BEFORE_SIGN_IN", false)
  );

  const sendVerificationOnRegister = readBoolEnv(
    env,
    "EMAIL_VERIFICATION_SEND_ON_REGISTER",
    true
  );

  const singleActiveSession = readBoolEnv(env, "AUTH_SINGLE_ACTIVE_SESSION", false);
  const revocationPollIntervalSeconds = readIntEnv(
    env,
    "AUTH_SESSION_REVOCATION_POLL_SECONDS",
    singleActiveSession ? 10 : 0,
    { min: 0, max: 3600 }
  );

  const passwordStrengthPosition = readEnumEnv(
    env,
    "AUTH_PASSWORD_STRENGTH_POSITION",
    ["above", "below"] as const,
    "above"
  );

  const cookieSecureRaw = readEnv(env, "AUTH_COOKIE_SECURE");
  const cookieSecure =
    cookieSecureRaw === undefined
      ? env.NODE_ENV === "production"
      : readBoolEnv(env, "AUTH_COOKIE_SECURE", false);

  const googleClientId = readEnvWithLegacy(env, "AUTH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID");
  const googleClientSecret = readEnvWithLegacy(
    env,
    "AUTH_GOOGLE_CLIENT_SECRET",
    "GOOGLE_CLIENT_SECRET"
  );
  const appleClientId = readEnvWithLegacy(env, "AUTH_APPLE_CLIENT_ID", "APPLE_CLIENT_ID");
  const appleClientSecret = readEnvWithLegacy(
    env,
    "AUTH_APPLE_CLIENT_SECRET",
    "APPLE_CLIENT_SECRET"
  );
  const microsoftClientId = readEnvWithLegacy(
    env,
    "AUTH_MICROSOFT_CLIENT_ID",
    "AUTH_AZURE_AD_ID"
  );
  const microsoftClientSecret = readEnvWithLegacy(
    env,
    "AUTH_MICROSOFT_CLIENT_SECRET",
    "AUTH_AZURE_AD_SECRET"
  );
  const microsoftTenantId =
    readEnvWithLegacy(env, "AUTH_MICROSOFT_TENANT_ID", "AUTH_AZURE_AD_TENANT_ID") ??
    "common";

  const passwordPolicy = {
    enforcement: readEnumEnv(
      env,
      "AUTH_PASSWORD_POLICY_ENFORCEMENT",
      ["off", "warn", "enforce"] as const,
      readEnumEnv(
        env,
        "PASSWORD_POLICY_ENFORCEMENT",
        ["off", "warn", "enforce"] as const,
        "warn"
      )
    ),
    minLength: readIntEnv(
      env,
      "AUTH_PASSWORD_MIN_LENGTH",
      readIntEnv(env, "PASSWORD_MIN_LENGTH", 12, { min: 1, max: 128 }),
      { min: 1, max: 128 }
    ),
    requireUppercase: readBoolEnv(
      env,
      "AUTH_PASSWORD_REQUIRE_UPPERCASE",
      readBoolEnv(env, "PASSWORD_REQUIRE_UPPERCASE", false)
    ),
    requireLowercase: readBoolEnv(
      env,
      "AUTH_PASSWORD_REQUIRE_LOWERCASE",
      readBoolEnv(env, "PASSWORD_REQUIRE_LOWERCASE", false)
    ),
    requireNumber: readBoolEnv(
      env,
      "AUTH_PASSWORD_REQUIRE_NUMBER",
      readBoolEnv(env, "PASSWORD_REQUIRE_NUMBER", false)
    ),
    requireSymbol: readBoolEnv(
      env,
      "AUTH_PASSWORD_REQUIRE_SYMBOL",
      readBoolEnv(env, "PASSWORD_REQUIRE_SYMBOL", false)
    ),
    blockCommonPasswords: readBoolEnv(
      env,
      "AUTH_PASSWORD_BLOCK_COMMON_PASSWORDS",
      readBoolEnv(env, "PASSWORD_BLOCK_COMMON_PASSWORDS", true)
    ),
    minScore: readIntEnv(
      env,
      "AUTH_PASSWORD_MIN_SCORE",
      readIntEnv(env, "PASSWORD_MIN_SCORE", 2, { min: 0, max: 4 }),
      { min: 0, max: 4 }
    ),
  };

  const uiPaths = {
    home: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    checkEmail: "/check-email",
    verifyEmail: "/verify-email",
    loginTwoFactor: "/login/2fa",
    loginComplete: "/login/complete",
    accountDeleted: "/account-deleted",
    accountSettings: "/settings/account",
    securitySettings: "/settings/account",
    sessionsSettings: "/settings/account",
  };

  return {
    appName,
    appSlug,
    baseUrl,
    nextAuthSecret,
    twoFactorEncryptionKey,
    afterLoginPath,
    afterLogoutPath,
    requireEmailVerificationBeforeSignIn,
    sendVerificationOnRegister,
    singleActiveSession,
    revocationPollIntervalSeconds,
    passwordStrengthPosition,
    cookieSecure,
    googleClientId,
    googleClientSecret,
    appleClientId,
    appleClientSecret,
    microsoftClientId,
    microsoftClientSecret,
    microsoftTenantId,
    passwordPolicy,
    uiPaths,
  };
}

/** Client-safe UI config for providers; does not require server secrets at import time. */
export function buildSecureAuthUiPublicConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  defaults: { appName: string; appSlug: string; baseUrl: string } = PRODUCT_DEFAULTS
): SecureAuthUIPublicConfig {
  const parsed = parseSecureAuthEnv(env, defaults);

  return {
    appSlug: parsed.appSlug,
    appName: parsed.appName,
    paths: {
      ...parsed.uiPaths,
      afterLogin: parsed.afterLoginPath,
    },
    messages: { ...authPageMessages },
    passwordPolicy: parsed.passwordPolicy,
    passwordStrength: {
      position: parsed.passwordStrengthPosition,
    },
    sessionPolicy: {
      singleActiveSession: parsed.singleActiveSession,
      revocationPollIntervalSeconds: parsed.revocationPollIntervalSeconds,
    },
  };
}

export function buildSecureAuthConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  defaults: { appName: string; appSlug: string; baseUrl: string } = PRODUCT_DEFAULTS
): SecureAuthEnvSlice {
  const parsed = parseSecureAuthEnv(env, defaults);

  if (!parsed.nextAuthSecret) {
    throw new Error("NEXTAUTH_SECRET is required for @tgoliveira/secure-auth");
  }

  if (!parsed.twoFactorEncryptionKey) {
    throw new Error(
      "TWO_FACTOR_SECRET_ENCRYPTION_KEY is required for @tgoliveira/secure-auth"
    );
  }

  const {
    appName,
    appSlug,
    baseUrl,
    nextAuthSecret,
    twoFactorEncryptionKey,
    afterLoginPath,
    afterLogoutPath,
    requireEmailVerificationBeforeSignIn,
    sendVerificationOnRegister,
    singleActiveSession,
    revocationPollIntervalSeconds,
    passwordStrengthPosition,
    cookieSecure,
    googleClientId,
    googleClientSecret,
    appleClientId,
    appleClientSecret,
    microsoftClientId,
    microsoftClientSecret,
    microsoftTenantId,
    passwordPolicy,
    uiPaths,
  } = parsed;

  return {
    app: {
      name: appName,
      slug: appSlug,
      baseUrl,
    },
    auth: {
      afterLoginPath,
      afterLogoutPath,
      requireEmailVerificationBeforeSignIn,
      nextAuthSecret,
      twoFactorEncryptionKey,
    },
    accountPolicy: {
      sendVerificationOnRegister,
      requireEmailVerificationBeforeSignIn,
    },
    passwordPolicy,
    sessions: {
      maxAgeSeconds: readIntEnv(env, "AUTH_SESSION_MAX_AGE_SECONDS", 30 * 24 * 60 * 60, {
        min: 60,
        max: 365 * 24 * 60 * 60,
      }),
      lastUsedUpdateIntervalSeconds: readIntEnv(
        env,
        "AUTH_SESSION_LAST_USED_UPDATE_SECONDS",
        readIntEnv(env, "SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS", 300, {
          min: 0,
          max: 86_400,
        }),
        { min: 0, max: 86_400 }
      ),
      singleActiveSession,
      revocationPollIntervalSeconds,
    },
    rateLimit: {
      store: readEnumEnv(
        env,
        "AUTH_RATE_LIMIT_STORE",
        ["memory", "postgres"] as const,
        readEnumEnv(env, "RATE_LIMIT_STORE", ["memory", "postgres"] as const, "memory")
      ),
    },
    server: {
      cookieSecure,
    },
    debug: {
      authTrace: readBoolEnv(env, "AUTH_TRACE", false),
    },
    oauth: {
      google:
        googleClientId && googleClientSecret
          ? { clientId: googleClientId, clientSecret: googleClientSecret }
          : undefined,
      apple:
        appleClientId && appleClientSecret
          ? { clientId: appleClientId, clientSecret: appleClientSecret }
          : undefined,
      microsoft:
        microsoftClientId && microsoftClientSecret
          ? {
              clientId: microsoftClientId,
              clientSecret: microsoftClientSecret,
              tenantId: microsoftTenantId,
            }
          : undefined,
    },
    webauthn: {
      rpId: readEnv(env, "WEBAUTHN_RP_ID") ?? "localhost",
      rpName: readEnv(env, "WEBAUTHN_RP_NAME") ?? appName,
      origin: readEnv(env, "WEBAUTHN_ORIGIN") ?? baseUrl,
    },
    ui: {
      paths: uiPaths,
      messages: { ...authPageMessages },
      passwordStrength: {
        position: passwordStrengthPosition,
      },
    },
  };
}
