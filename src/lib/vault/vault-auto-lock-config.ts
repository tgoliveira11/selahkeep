/** Default vault inactivity auto-lock duration (minutes). */
export const DEFAULT_VAULT_AUTO_LOCK_MINUTES = 15;

const MIN_AUTO_LOCK_MINUTES = 1;
const MAX_AUTO_LOCK_MINUTES = 24 * 60;

function readAutoLockMinutesFromEnv(): number | null {
  const raw =
    process.env.NEXT_PUBLIC_VAULT_AUTO_LOCK_MINUTES ?? process.env.VAULT_AUTO_LOCK_MINUTES;
  if (raw == null || raw === "") return null;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return null;
  if (minutes < MIN_AUTO_LOCK_MINUTES || minutes > MAX_AUTO_LOCK_MINUTES) return null;
  return minutes;
}

/** Milliseconds until vault auto-lock after inactivity. Env override optional. */
export function getVaultAutoLockTimeoutMs(): number {
  const minutes = readAutoLockMinutesFromEnv();
  const resolved = minutes ?? DEFAULT_VAULT_AUTO_LOCK_MINUTES;
  return resolved * 60 * 1000;
}

/** Module-load constant for tests and countdown math that expect a stable export. */
export const VAULT_INACTIVITY_MS = getVaultAutoLockTimeoutMs();
