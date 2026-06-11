export type AccountLoginMethod = "passkey" | "credentials" | "oauth";

/**
 * TOTP is required only for email/password sign-in when 2FA is enabled.
 * Passkey sign-in bypasses TOTP. OAuth follows the partial-session 2FA gate.
 */
export function requiresTotpAfterLogin(method: AccountLoginMethod, twoFactorEnabled: boolean): boolean {
  if (method === "passkey") return false;
  if (method === "credentials") return twoFactorEnabled;
  return twoFactorEnabled;
}
