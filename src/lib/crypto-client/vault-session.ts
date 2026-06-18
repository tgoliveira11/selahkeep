import { isVaultUnlocked, lockVault, setSessionVaultKey } from "./vault";
import { clearNoteBodyCache } from "@/features/notes/eager-decrypt-notes";

export const VAULT_INACTIVITY_MS = 15 * 60 * 1000;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let onAutoLock: (() => void) | null = null;
let manuallyLocked = false;
let lastActivityAt = 0;
const listeners = new Set<() => void>();
const activityListeners = new Set<() => void>();

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

function notifyActivityChange(): void {
  for (const listener of activityListeners) {
    listener();
  }
}

/** Milliseconds until auto-lock, or `null` when the vault is not in an active unlocked session. */
export function getVaultAutoLockRemainingMs(): number | null {
  if (!isVaultUnlocked() || manuallyLocked || lastActivityAt === 0) return null;
  return Math.max(0, VAULT_INACTIVITY_MS - (Date.now() - lastActivityAt));
}

/** Subscribe to inactivity timer resets (for countdown UI). */
export function subscribeVaultActivityTimer(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

export function scheduleVaultAutoLock(): void {
  if (!isVaultUnlocked() || manuallyLocked) return;
  clearVaultAutoLockTimer();
  lastActivityAt = Date.now();
  notifyActivityChange();
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
  lastActivityAt = 0;
  notifyActivityChange();
  clearNoteBodyCache();
  lockVault();
  manuallyLocked = true;
  notifyVaultSessionChange();
}

/** Clears manual lock flag when signing out (IndexedDB cleared separately). */
export function resetVaultSessionLockState(): void {
  manuallyLocked = false;
  clearVaultAutoLockTimer();
  lastActivityAt = 0;
  notifyActivityChange();
  notifyVaultSessionChange();
}

/** Clears in-memory vault key on tab close/reload (best effort). */
export function registerVaultUnloadGuard(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handler = () => lockVaultSession();
  window.addEventListener("pagehide", handler);
  return () => window.removeEventListener("pagehide", handler);
}
