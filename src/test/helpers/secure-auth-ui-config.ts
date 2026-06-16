import type { SecureAuthUIPublicConfig } from "@tgoliveira/secure-auth/react";

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
  messages: {
    loginTitle: "Welcome back",
    loginDescription: "Sign in to continue writing your private letters.",
    registerTitle: "Create your account",
    registerDescription: "Start writing private letters protected on your device.",
    loginTwoFactorTitle: "Two-factor authentication",
    loginTwoFactorDescription:
      "Enter the 6-digit code from your authenticator app to finish signing in.",
    loginCompleteTitle: "Signing you in",
    loginCompleteDescription: "Finishing your sign-in securely.",
    registerLinkLabel: "Create one",
    securitySettingsTitle: "Security settings",
    sessionsSettingsTitle: "Active sessions",
    dashboardTitle: "My letters",
  },
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
