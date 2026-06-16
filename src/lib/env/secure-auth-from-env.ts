import type { SecureAuthConfig } from "@tgoliveira/secure-auth";
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

export function buildSecureAuthConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  defaults: { appName: string; appSlug: string; baseUrl: string }
): SecureAuthEnvSlice {
  const appName = readEnv(env, "APP_NAME") ?? defaults.appName;
  const appSlug = readEnv(env, "APP_SLUG") ?? defaults.appSlug;
  const baseUrl =
    readEnvWithLegacy(env, "APP_BASE_URL", "NEXTAUTH_URL") ?? defaults.baseUrl;

  const nextAuthSecret = readEnv(env, "NEXTAUTH_SECRET");
  if (!nextAuthSecret) {
    throw new Error("NEXTAUTH_SECRET is required for @tgoliveira/secure-auth");
  }

  const twoFactorEncryptionKey = readEnv(env, "TWO_FACTOR_SECRET_ENCRYPTION_KEY");
  if (!twoFactorEncryptionKey) {
    throw new Error(
      "TWO_FACTOR_SECRET_ENCRYPTION_KEY is required for @tgoliveira/secure-auth"
    );
  }

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
    passwordPolicy: {
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
        readIntEnv(env, "PASSWORD_MIN_LENGTH", 12, { min: 8, max: 128 }),
        { min: 8, max: 128 }
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
    },
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
      paths: {
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
      },
      messages: {
        loginTitle: "Welcome back",
        loginDescription: "Sign in to continue writing your private letters.",
        registerTitle: "Create your account",
        registerDescription: "Start writing private letters protected on your device.",
        loginTwoFactorTitle: "Two-factor authentication",
        loginTwoFactorDescription:
          "Enter the 6-digit code from your authenticator app to finish signing in.",
        securitySettingsTitle: "Security settings",
        sessionsSettingsTitle: "Active sessions",
        dashboardTitle: "My letters",
      },
      passwordStrength: {
        position: passwordStrengthPosition,
      },
    },
  };
}
