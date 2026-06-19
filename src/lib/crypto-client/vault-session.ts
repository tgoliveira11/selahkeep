import { clearNoteBodyCache } from "@/features/notes/eager-decrypt-notes";
import {
  getVaultAutoLockTimeoutMs,
  VAULT_INACTIVITY_MS,
} from "@/lib/vault/vault-auto-lock-config";

export { VAULT_INACTIVITY_MS };

export type VaultUnlockMethod = "password" | "recovery_phrase" | "passkey_prf";

export type VaultLockReason = "manual" | "auto_lock" | "logout" | "account_switch" | "error";

export type VaultSessionState = {
  status: "locked" | "unlocked";
  hasUserVaultKey: boolean;
  unlockedAt?: number;
  lastActivityAt?: number;
  unlockMethod?: VaultUnlockMethod;
};

type BeforeAutoLockHandler = () => void | Promise<void>;

type VaultSessionStore = {
  sessionVaultKey: CryptoKey | null;
  manuallyLocked: boolean;
  lockedByInactivity: boolean;
  unlockedAt: number;
  lastActivityAt: number;
  unlockMethod?: VaultUnlockMethod;
  inactivityTimer: ReturnType<typeof setTimeout> | null;
  onAutoLock: (() => void) | null;
  listeners: Set<(state: VaultSessionState) => void>;
  activityListeners: Set<() => void>;
  beforeAutoLockHandlers: Set<BeforeAutoLockHandler>;
  unloadGuardRegistered: boolean;
};

const VAULT_SESSION_STORE_KEY = "__selahkeepVaultSessionStore";

function createVaultSessionStore(): VaultSessionStore {
  return {
    sessionVaultKey: null,
    manuallyLocked: false,
    lockedByInactivity: false,
    unlockedAt: 0,
    lastActivityAt: 0,
    unlockMethod: undefined,
    inactivityTimer: null,
    onAutoLock: null,
    listeners: new Set(),
    activityListeners: new Set(),
    beforeAutoLockHandlers: new Set(),
    unloadGuardRegistered: false,
  };
}

function getVaultSessionStore(): VaultSessionStore {
  const globalRecord = globalThis as typeof globalThis & {
    [VAULT_SESSION_STORE_KEY]?: VaultSessionStore;
  };
  if (!globalRecord[VAULT_SESSION_STORE_KEY]) {
    globalRecord[VAULT_SESSION_STORE_KEY] = createVaultSessionStore();
    if (process.env.NODE_ENV === "development") {
      console.info("vault session module initialized");
    }
  }
  return globalRecord[VAULT_SESSION_STORE_KEY]!;
}

function buildVaultSessionSnapshot(store: VaultSessionStore): VaultSessionState {
  const hasUserVaultKey = store.sessionVaultKey !== null;
  const unlocked = hasUserVaultKey && !store.manuallyLocked;
  return {
    status: unlocked ? "unlocked" : "locked",
    hasUserVaultKey,
    unlockedAt: unlocked ? store.unlockedAt : undefined,
    lastActivityAt: unlocked ? store.lastActivityAt : undefined,
    unlockMethod: unlocked ? store.unlockMethod : undefined,
  };
}

function notifyVaultSessionChange(): void {
  const store = getVaultSessionStore();
  const snapshot = buildVaultSessionSnapshot(store);
  if (process.env.NODE_ENV === "development") {
    console.info(`vault session status changed: ${snapshot.status}`);
  }
  for (const listener of store.listeners) {
    listener(snapshot);
  }
}

export function getVaultSessionSnapshot(): VaultSessionState {
  return buildVaultSessionSnapshot(getVaultSessionStore());
}

export function getUserVaultKey(): CryptoKey | null {
  return getVaultSessionStore().sessionVaultKey;
}

export function getSessionVaultKey(): CryptoKey | null {
  return getUserVaultKey();
}

/** Test/setup helper — does not clear manual lock. Prefer setUnlockedVaultSession for unlock flows. */
export function setSessionVaultKey(key: CryptoKey | null): void {
  const store = getVaultSessionStore();
  store.sessionVaultKey = key;
  if (key === null) {
    store.unlockedAt = 0;
    store.unlockMethod = undefined;
  }
  notifyVaultSessionChange();
}

export function lockVault(): void {
  const store = getVaultSessionStore();
  store.sessionVaultKey = null;
  store.unlockedAt = 0;
  store.unlockMethod = undefined;
}

export function isVaultUnlocked(): boolean {
  return getVaultSessionStore().sessionVaultKey !== null;
}

export function hasUnlockedVaultSession(): boolean {
  const store = getVaultSessionStore();
  return store.sessionVaultKey !== null && !store.manuallyLocked;
}

export function setUnlockedVaultSession(args: {
  userVaultKey: CryptoKey;
  method: VaultUnlockMethod;
}): void {
  const store = getVaultSessionStore();
  store.manuallyLocked = false;
  store.lockedByInactivity = false;
  store.sessionVaultKey = args.userVaultKey;
  store.unlockedAt = Date.now();
  store.unlockMethod = args.method;
  if (process.env.NODE_ENV === "development") {
    console.info(`vault unlock method: ${args.method}`);
  }
  scheduleVaultAutoLock();
  notifyVaultSessionChange();
}

export function unlockVaultSession(
  vaultKey: CryptoKey,
  method: VaultUnlockMethod = "password"
): void {
  setUnlockedVaultSession({ userVaultKey: vaultKey, method });
}

export function clearVaultCoreClientState(): void {
  lockVault();
}

export function isVaultManuallyLocked(): boolean {
  return getVaultSessionStore().manuallyLocked;
}

export function wasVaultLockedByInactivity(): boolean {
  return getVaultSessionStore().lockedByInactivity;
}

export function subscribeVaultSession(
  listener: (state: VaultSessionState) => void
): () => void {
  const store = getVaultSessionStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export function configureVaultAutoLock(callback?: () => void): void {
  getVaultSessionStore().onAutoLock = callback ?? null;
}

export function registerVaultBeforeAutoLock(handler: BeforeAutoLockHandler): () => void {
  const store = getVaultSessionStore();
  store.beforeAutoLockHandlers.add(handler);
  return () => store.beforeAutoLockHandlers.delete(handler);
}

async function runBeforeAutoLockHandlers(): Promise<void> {
  const handlers = [...getVaultSessionStore().beforeAutoLockHandlers];
  await Promise.all(handlers.map((handler) => handler()));
}

export function clearVaultAutoLockTimer(): void {
  const store = getVaultSessionStore();
  if (store.inactivityTimer) {
    clearTimeout(store.inactivityTimer);
    store.inactivityTimer = null;
  }
}

function notifyActivityChange(): void {
  for (const listener of getVaultSessionStore().activityListeners) {
    listener();
  }
}

export function getVaultAutoLockRemainingMs(): number | null {
  const store = getVaultSessionStore();
  if (!hasUnlockedVaultSession() || store.lastActivityAt === 0) return null;
  const timeoutMs = getVaultAutoLockTimeoutMs();
  return Math.max(0, timeoutMs - (Date.now() - store.lastActivityAt));
}

export function subscribeVaultActivityTimer(listener: () => void): () => void {
  const store = getVaultSessionStore();
  store.activityListeners.add(listener);
  return () => store.activityListeners.delete(listener);
}

function getInactivityTimeoutMs(): number {
  return getVaultAutoLockTimeoutMs();
}

export function scheduleVaultAutoLock(): void {
  const store = getVaultSessionStore();
  if (!hasUnlockedVaultSession()) return;
  clearVaultAutoLockTimer();
  store.lastActivityAt = Date.now();
  notifyActivityChange();
  const timeoutMs = getInactivityTimeoutMs();
  store.inactivityTimer = setTimeout(() => {
    void (async () => {
      await runBeforeAutoLockHandlers();
      lockVaultSession("auto_lock");
      store.onAutoLock?.();
    })();
  }, timeoutMs);
}

export function touchVaultSession(): void {
  if (hasUnlockedVaultSession()) {
    scheduleVaultAutoLock();
  }
}

export function lockVaultSession(reason: VaultLockReason = "manual"): void {
  const store = getVaultSessionStore();
  if (reason === "auto_lock") {
    store.lockedByInactivity = true;
  } else if (reason === "manual" || reason === "error") {
    store.lockedByInactivity = false;
  } else if (reason === "logout" || reason === "account_switch") {
    store.lockedByInactivity = false;
  }

  clearVaultAutoLockTimer();
  store.lastActivityAt = 0;
  notifyActivityChange();
  clearNoteBodyCache();
  lockVault();
  store.manuallyLocked = true;
  notifyVaultSessionChange();
}

export function lockVaultSessionManually(): void {
  lockVaultSession("manual");
}

export function resetVaultSessionLockState(): void {
  const store = getVaultSessionStore();
  store.manuallyLocked = false;
  store.lockedByInactivity = false;
  clearVaultAutoLockTimer();
  store.lastActivityAt = 0;
  notifyActivityChange();
  notifyVaultSessionChange();
}

export function registerVaultUnloadGuard(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const store = getVaultSessionStore();
  if (store.unloadGuardRegistered) {
    return () => undefined;
  }

  const handler = () => lockVaultSession("auto_lock");
  window.addEventListener("pagehide", handler);
  store.unloadGuardRegistered = true;

  return () => {
    window.removeEventListener("pagehide", handler);
    store.unloadGuardRegistered = false;
  };
}

/** @internal tests */
export function resetVaultSessionStoreForTests(): void {
  const globalRecord = globalThis as typeof globalThis & {
    [VAULT_SESSION_STORE_KEY]?: VaultSessionStore;
  };
  delete globalRecord[VAULT_SESSION_STORE_KEY];
}
