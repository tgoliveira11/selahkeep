const USER_ID_KEY = "letters-passkey-login-user-id";
const CREDENTIAL_ID_KEY = "letters-passkey-login-credential-id";
const USER_ID_COOKIE = "letters-passkey-login-user-id";
const CREDENTIAL_ID_COOKIE = "letters-passkey-login-credential-id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export type PasskeyLoginHint = {
  userId?: string;
  credentialId?: string;
};

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;
  const value = decodeURIComponent(match[1]);
  return value.length > 0 ? value : undefined;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

export function getPasskeyLoginHint(): PasskeyLoginHint | null {
  if (typeof window === "undefined") return null;

  const userId = localStorage.getItem(USER_ID_KEY) ?? readCookie(USER_ID_COOKIE);
  const credentialId = localStorage.getItem(CREDENTIAL_ID_KEY) ?? readCookie(CREDENTIAL_ID_COOKIE);

  if (!userId && !credentialId) return null;
  return { userId, credentialId };
}

export function setPasskeyLoginHint(hint: PasskeyLoginHint): void {
  if (typeof window === "undefined") return;

  if (hint.userId) {
    localStorage.setItem(USER_ID_KEY, hint.userId);
    writeCookie(USER_ID_COOKIE, hint.userId);
  } else {
    localStorage.removeItem(USER_ID_KEY);
    clearCookie(USER_ID_COOKIE);
  }

  if (hint.credentialId) {
    localStorage.setItem(CREDENTIAL_ID_KEY, hint.credentialId);
    writeCookie(CREDENTIAL_ID_COOKIE, hint.credentialId);
  } else {
    localStorage.removeItem(CREDENTIAL_ID_KEY);
    clearCookie(CREDENTIAL_ID_COOKIE);
  }
}

export function clearPasskeyLoginHint(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(CREDENTIAL_ID_KEY);
  clearCookie(USER_ID_COOKIE);
  clearCookie(CREDENTIAL_ID_COOKIE);
}
