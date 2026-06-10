import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  lockVaultSession,
  unlockVaultSession,
  scheduleVaultAutoLock,
  isVaultManuallyLocked,
  subscribeVaultSession,
  VAULT_INACTIVITY_MS,
  clearVaultAutoLockTimer,
} from "@/lib/crypto-client/vault-session";
import { generateUserVaultKey, isVaultUnlocked, setSessionVaultKey } from "@/lib/crypto-client/vault";

describe("vault session auto-lock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearVaultAutoLockTimer();
    setSessionVaultKey(null);
  });

  afterEach(() => {
    lockVaultSession();
    vi.useRealTimers();
  });

  it("locks vault after inactivity timeout", async () => {
    const key = await generateUserVaultKey();
    unlockVaultSession(key);
    expect(isVaultUnlocked()).toBe(true);
    vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
    expect(isVaultUnlocked()).toBe(false);
    expect(isVaultManuallyLocked()).toBe(true);
  });

  it("manual lock clears vault key and blocks silent unlock until explicit unlock", async () => {
    setSessionVaultKey(await generateUserVaultKey());
    lockVaultSession();
    expect(isVaultUnlocked()).toBe(false);
    expect(isVaultManuallyLocked()).toBe(true);
  });

  it("explicit unlock clears manual lock flag", async () => {
    lockVaultSession();
    unlockVaultSession(await generateUserVaultKey());
    expect(isVaultUnlocked()).toBe(true);
    expect(isVaultManuallyLocked()).toBe(false);
  });

  it("notifies subscribers when locked", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeVaultSession(listener);
    lockVaultSession();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("does not schedule auto-lock while manually locked", async () => {
    lockVaultSession();
    scheduleVaultAutoLock();
    vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
    expect(isVaultUnlocked()).toBe(false);
  });
});
