import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  lockVaultSession,
  scheduleVaultAutoLock,
  touchVaultSession,
  VAULT_INACTIVITY_MS,
  clearVaultAutoLockTimer,
} from "@/lib/crypto-client/vault-session";
import { generateUserVaultKey, isVaultUnlocked, setSessionVaultKey } from "@/lib/crypto-client/vault";

describe("vault session auto-lock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearVaultAutoLockTimer();
  });

  afterEach(() => {
    lockVaultSession();
    vi.useRealTimers();
  });

  it("locks vault after inactivity timeout", async () => {
    const key = await generateUserVaultKey();
    setSessionVaultKey(key);
    scheduleVaultAutoLock();
    expect(isVaultUnlocked()).toBe(true);
    vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
    expect(isVaultUnlocked()).toBe(false);
  });

  it("manual lock clears vault key", async () => {
    setSessionVaultKey(await generateUserVaultKey());
    lockVaultSession();
    expect(isVaultUnlocked()).toBe(false);
  });

  it("touchVaultSession resets inactivity timer", async () => {
    setSessionVaultKey(await generateUserVaultKey());
    scheduleVaultAutoLock();
    vi.advanceTimersByTime(VAULT_INACTIVITY_MS - 1000);
    touchVaultSession();
    vi.advanceTimersByTime(1500);
    expect(isVaultUnlocked()).toBe(true);
  });
});
