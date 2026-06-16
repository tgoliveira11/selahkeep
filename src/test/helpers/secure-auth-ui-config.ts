import type { SecureAuthUIPublicConfig } from "@tgoliveira/secure-auth/react";
import { authPageMessages } from "@/lib/auth/auth-page-messages";

/** Minimal UI config for rendering @tgoliveira/secure-auth pages in Vitest. */
export const testSecureAuthUiConfig: SecureAuthUIPublicConfig = {
  appSlug: "letters-to-god",
  appName: "Letters to God",
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
    afterLogin: "/letters",
    accountDeleted: "/account-deleted",
    accountSettings: "/settings/account",
    securitySettings: "/settings/account",
    sessionsSettings: "/settings/account",
  },
  messages: { ...authPageMessages },
  passwordPolicy: {
    enforcement: "warn",
    minLength: 12,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSymbol: false,
    blockCommonPasswords: true,
    minScore: 2,
  },
  passwordStrength: { position: "above" },
  sessionPolicy: {
    singleActiveSession: false,
    revocationPollIntervalSeconds: 0,
  },
};
