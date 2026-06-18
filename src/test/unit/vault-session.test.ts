import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  lockVaultSession,
  unlockVaultSession,
  scheduleVaultAutoLock,
  touchVaultSession,
  configureVaultAutoLock,
  isVaultManuallyLocked,
  subscribeVaultSession,
  VAULT_INACTIVITY_MS,
  getVaultAutoLockRemainingMs,
  subscribeVaultActivityTimer,
  clearVaultAutoLockTimer,
} from "@/lib/crypto-client/vault-session";
import { generateUserVaultKey, isVaultUnlocked, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { setCachedNoteBody, getCachedNoteBody } from "@/features/notes/eager-decrypt-notes";

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

  it("returns null remaining time when vault is locked", async () => {
    lockVaultSession();
    expect(getVaultAutoLockRemainingMs()).toBeNull();
  });

  it("notifies activity timer subscribers on touch", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeVaultActivityTimer(listener);
    unlockVaultSession(await generateUserVaultKey());
    expect(listener).toHaveBeenCalled();
    touchVaultSession();
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
    unsubscribe();
  });

  it("returns remaining time while unlocked", async () => {
    const key = await generateUserVaultKey();
    unlockVaultSession(key);
    const remaining = getVaultAutoLockRemainingMs();
    expect(remaining).not.toBeNull();
    expect(remaining).toBeGreaterThan(VAULT_INACTIVITY_MS - 1000);
    vi.advanceTimersByTime(60_000);
    touchVaultSession();
    const afterTouch = getVaultAutoLockRemainingMs();
    expect(afterTouch).not.toBeNull();
    expect(afterTouch!).toBeGreaterThan(remaining! - 60_000);
  });

  it("touchVaultSession resets inactivity timer", async () => {
    const key = await generateUserVaultKey();
    unlockVaultSession(key);
    vi.advanceTimersByTime(VAULT_INACTIVITY_MS - 1000);
    touchVaultSession();
    vi.advanceTimersByTime(2000);
    expect(isVaultUnlocked()).toBe(true);
    vi.advanceTimersByTime(VAULT_INACTIVITY_MS);
    expect(isVaultUnlocked()).toBe(false);
  });

  it("configureVaultAutoLock callback runs only on inactivity lock", async () => {
    const callback = vi.fn();
    configureVaultAutoLock(callback);
    unlockVaultSession(await generateUserVaultKey());
    lockVaultSession();
    expect(callback).not.toHaveBeenCalled();
    unlockVaultSession(await generateUserVaultKey());
    vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
    expect(callback).toHaveBeenCalledTimes(1);
    configureVaultAutoLock();
  });

  it("lockVaultSession clears eager-decrypt note body cache", async () => {
    setCachedNoteBody("n1", "cached");
    unlockVaultSession(await generateUserVaultKey());
    lockVaultSession();
    expect(getCachedNoteBody("n1")).toBeUndefined();
  });
});
