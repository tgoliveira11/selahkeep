/** Align account session expiry with NextAuth JWT session max age (seconds). */
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function getSessionMaxAgeMs(): number {
  const configured = Number(process.env.NEXTAUTH_SESSION_MAX_AGE ?? DEFAULT_SESSION_MAX_AGE_SECONDS);
  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_SESSION_MAX_AGE_SECONDS * 1000;
  }
  return configured * 1000;
}

export function getSessionLastUsedUpdateIntervalMs(): number {
  const seconds = Number(process.env.SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS ?? "300");
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 300_000;
  }
  return seconds * 1000;
}
