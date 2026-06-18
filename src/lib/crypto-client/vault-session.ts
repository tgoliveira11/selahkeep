import { isVaultUnlocked, lockVault, setSessionVaultKey } from "./vault";
import { clearNoteBodyCache } from "@/features/notes/eager-decrypt-notes";
import {
  getVaultAutoLockTimeoutMs,
  VAULT_INACTIVITY_MS,
} from "@/lib/vault/vault-auto-lock-config";

export { VAULT_INACTIVITY_MS };

type BeforeAutoLockHandler = () => void | Promise<void>;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let onAutoLock: (() => void) | null = null;
let manuallyLocked = false;
let lockedByInactivity = false;
let lastActivityAt = 0;
const listeners = new Set<() => void>();
const activityListeners = new Set<() => void>();
const beforeAutoLockHandlers = new Set<BeforeAutoLockHandler>();

function notifyVaultSessionChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function isVaultManuallyLocked(): boolean {
  return manuallyLocked;
}

/** True when the most recent lock was triggered by inactivity (until next unlock). */
export function wasVaultLockedByInactivity(): boolean {
  return lockedByInactivity;
}

/** Subscribe to manual lock/unlock changes (for UI to hide decrypted content). */
export function subscribeVaultSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function configureVaultAutoLock(callback?: () => void): void {
  onAutoLock = callback ?? null;
}

export function registerVaultBeforeAutoLock(handler: BeforeAutoLockHandler): () => void {
  beforeAutoLockHandlers.add(handler);
  return () => beforeAutoLockHandlers.delete(handler);
}

async function runBeforeAutoLockHandlers(): Promise<void> {
  const handlers = [...beforeAutoLockHandlers];
  await Promise.all(handlers.map((handler) => handler()));
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
  const timeoutMs = getVaultAutoLockTimeoutMs();
  return Math.max(0, timeoutMs - (Date.now() - lastActivityAt));
}

/** Subscribe to inactivity timer resets (for countdown UI). */
export function subscribeVaultActivityTimer(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

function getInactivityTimeoutMs(): number {
  return getVaultAutoLockTimeoutMs();
}

export function scheduleVaultAutoLock(): void {
  if (!isVaultUnlocked() || manuallyLocked) return;
  clearVaultAutoLockTimer();
  lastActivityAt = Date.now();
  notifyActivityChange();
  const timeoutMs = getInactivityTimeoutMs();
  inactivityTimer = setTimeout(() => {
    void (async () => {
      lockedByInactivity = true;
      await runBeforeAutoLockHandlers();
      lockVaultSession();
      onAutoLock?.();
    })();
  }, timeoutMs);
}

export function touchVaultSession(): void {
  if (isVaultUnlocked() && !manuallyLocked) {
    scheduleVaultAutoLock();
  }
}

/** Explicit user unlock — clears manual lock and starts inactivity timer. */
export function unlockVaultSession(vaultKey: CryptoKey): void {
  manuallyLocked = false;
  lockedByInactivity = false;
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

/** Manual lock from UI — does not mark as inactivity lock. */
export function lockVaultSessionManually(): void {
  lockedByInactivity = false;
  lockVaultSession();
}

/** Clears manual lock flag when signing out (IndexedDB cleared separately). */
export function resetVaultSessionLockState(): void {
  manuallyLocked = false;
  lockedByInactivity = false;
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
