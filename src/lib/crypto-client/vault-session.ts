import { isVaultUnlocked, lockVault, setSessionVaultKey } from "./vault";

export const VAULT_INACTIVITY_MS = 15 * 60 * 1000;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let onAutoLock: (() => void) | null = null;
let manuallyLocked = false;
const listeners = new Set<() => void>();

function notifyVaultSessionChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function isVaultManuallyLocked(): boolean {
  return manuallyLocked;
}

/** Subscribe to manual lock/unlock changes (for UI to hide decrypted content). */
export function subscribeVaultSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

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
  if (!isVaultUnlocked() || manuallyLocked) return;
  clearVaultAutoLockTimer();
  inactivityTimer = setTimeout(() => {
    lockVaultSession();
    onAutoLock?.();
  }, VAULT_INACTIVITY_MS);
}

export function touchVaultSession(): void {
  if (isVaultUnlocked() && !manuallyLocked) {
    scheduleVaultAutoLock();
  }
}

/** Explicit user unlock — clears manual lock and starts inactivity timer. */
export function unlockVaultSession(vaultKey: CryptoKey): void {
  manuallyLocked = false;
  setSessionVaultKey(vaultKey);
  scheduleVaultAutoLock();
  notifyVaultSessionChange();
}

/** Manual or inactivity lock — keeps IndexedDB but blocks silent re-unlock until explicit unlock. */
export function lockVaultSession(): void {
  clearVaultAutoLockTimer();
  lockVault();
  manuallyLocked = true;
  notifyVaultSessionChange();
}

/** Clears manual lock flag when signing out (IndexedDB cleared separately). */
export function resetVaultSessionLockState(): void {
  manuallyLocked = false;
  clearVaultAutoLockTimer();
  notifyVaultSessionChange();
}

/** Clears in-memory vault key on tab close/reload (best effort). */
export function registerVaultUnloadGuard(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handler = () => lockVaultSession();
  window.addEventListener("pagehide", handler);
  return () => window.removeEventListener("pagehide", handler);
}
