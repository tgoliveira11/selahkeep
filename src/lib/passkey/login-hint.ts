import {
  clearPasskeyLoginHint as clearPackagePasskeyLoginHint,
  getPasskeyLoginHint as getPackagePasskeyLoginHint,
  setPasskeyLoginHint as setPackagePasskeyLoginHint,
  type PasskeyLoginHint,
} from "@tgoliveira/secure-auth/client";
import { APP_PASSKEY_SLUG } from "@/lib/passkey/app-slug";

export type { PasskeyLoginHint };

const LEGACY_USER_ID_KEY = "letters-passkey-login-user-id";
const LEGACY_CREDENTIAL_ID_KEY = "letters-passkey-login-credential-id";
const LEGACY_USER_ID_COOKIE = "letters-passkey-login-user-id";
const LEGACY_CREDENTIAL_ID_COOKIE = "letters-passkey-login-credential-id";

function migrateLegacyHint(): void {
  if (typeof window === "undefined") return;

  const current = getPackagePasskeyLoginHint(APP_PASSKEY_SLUG);
  if (current?.userId || current?.credentialId) return;

  const legacyUserId =
    localStorage.getItem(LEGACY_USER_ID_KEY) ??
    readLegacyCookie(LEGACY_USER_ID_COOKIE);
  const legacyCredentialId =
    localStorage.getItem(LEGACY_CREDENTIAL_ID_KEY) ??
    readLegacyCookie(LEGACY_CREDENTIAL_ID_COOKIE);

  if (!legacyUserId && !legacyCredentialId) return;

  setPackagePasskeyLoginHint(APP_PASSKEY_SLUG, {
    userId: legacyUserId ?? undefined,
    credentialId: legacyCredentialId ?? undefined,
  });

  localStorage.removeItem(LEGACY_USER_ID_KEY);
  localStorage.removeItem(LEGACY_CREDENTIAL_ID_KEY);
  clearLegacyCookie(LEGACY_USER_ID_COOKIE);
  clearLegacyCookie(LEGACY_CREDENTIAL_ID_COOKIE);
}

function readLegacyCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;
  const value = decodeURIComponent(match[1]);
  return value.length > 0 ? value : undefined;
}

function clearLegacyCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

export function getPasskeyLoginHint(): PasskeyLoginHint | null {
  migrateLegacyHint();
  return getPackagePasskeyLoginHint(APP_PASSKEY_SLUG);
}

export function setPasskeyLoginHint(hint: PasskeyLoginHint): void {
  setPackagePasskeyLoginHint(APP_PASSKEY_SLUG, hint);
}

export function clearPasskeyLoginHint(): void {
  clearPackagePasskeyLoginHint(APP_PASSKEY_SLUG);
  localStorage.removeItem(LEGACY_USER_ID_KEY);
  localStorage.removeItem(LEGACY_CREDENTIAL_ID_KEY);
  clearLegacyCookie(LEGACY_USER_ID_COOKIE);
  clearLegacyCookie(LEGACY_CREDENTIAL_ID_COOKIE);
}
