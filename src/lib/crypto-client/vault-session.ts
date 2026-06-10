import { isVaultUnlocked, lockVault, setSessionVaultKey } from "./vault";

export const VAULT_INACTIVITY_MS = 15 * 60 * 1000;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let onAutoLock: (() => void) | null = null;

export function configureVaultAutoLock(callback?: () => void): void {
  onAutoLock = callback ?? null;
}

export function clearVaultAutoLockTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

export function scheduleVaultAutoLock(): void {
  if (!isVaultUnlocked()) return;
  clearVaultAutoLockTimer();
  inactivityTimer = setTimeout(() => {
    lockVault();
    onAutoLock?.();
  }, VAULT_INACTIVITY_MS);
}

export function touchVaultSession(): void {
  if (isVaultUnlocked()) {
    scheduleVaultAutoLock();
  }
}

export function unlockVaultSession(vaultKey: CryptoKey): void {
  setSessionVaultKey(vaultKey);
  scheduleVaultAutoLock();
}

export function lockVaultSession(): void {
  clearVaultAutoLockTimer();
  lockVault();
}

/** Clears in-memory vault key on tab close/reload (best effort). */
export function registerVaultUnloadGuard(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handler = () => lockVaultSession();
  window.addEventListener("pagehide", handler);
  return () => window.removeEventListener("pagehide", handler);
}
