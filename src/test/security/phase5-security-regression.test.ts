import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { configureVaultAutoLock, lockVaultSession, unlockVaultSession, VAULT_INACTIVITY_MS, clearVaultAutoLockTimer } from "@/lib/crypto-client/vault-session";
import {
  clearNoteBodyCache,
  setCachedNoteBody,
} from "@/features/notes/eager-decrypt-notes";import { generateUserVaultKey, isVaultUnlocked } from "@/lib/crypto-client/vault";
import { ACCOUNT_PASSWORD_VAULT_NOTE } from "@/lib/account-auth-messages";

describe("Phase 5 security regression", () => {
  describe("vault inactivity lock", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      clearVaultAutoLockTimer();
      lockVaultSession();
      clearNoteBodyCache();
    });

    afterEach(() => {
      lockVaultSession();
      configureVaultAutoLock();
      vi.useRealTimers();
    });

    it("clears note body cache when vault locks", async () => {
      setCachedNoteBody("note-1", "secret body");
      await unlockVaultSession(await generateUserVaultKey(), "password");
      lockVaultSession();
      expect(isVaultUnlocked()).toBe(false);
      const { getCachedNoteBody } = await import("@/features/notes/eager-decrypt-notes");
      expect(getCachedNoteBody("note-1")).toBeUndefined();
    });

    it("fires configureVaultAutoLock callback after inactivity", async () => {
      const onAutoLock = vi.fn();
      configureVaultAutoLock(onAutoLock);
      await unlockVaultSession(await generateUserVaultKey(), "password");
      vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
      await vi.runAllTimersAsync();
      expect(onAutoLock).toHaveBeenCalledTimes(1);
      expect(isVaultUnlocked()).toBe(false);
    });
  });

  describe("logout clears vault", () => {
    it("nav sign-out path calls lockVaultSession before clearing client state", () => {
      const navSource = readFileSync(
        join(process.cwd(), "src/components/layout/nav.tsx"),
        "utf8"
      );
      expect(navSource).toContain("lockVaultSession()");
      expect(navSource).toContain("clearVaultClientState");
      const signOutBlock = navSource.slice(navSource.indexOf("async function handleSignOut"));
      expect(signOutBlock.indexOf("lockVaultSession")).toBeLessThan(
        signOutBlock.indexOf("clearVaultClientState")
      );
    });
  });

  describe("password reset does not unlock vault", () => {
    it("password reset email includes vault separation note", () => {
      const secureAuth = readFileSync(
        join(process.cwd(), "src/lib/secure-auth.ts"),
        "utf8"
      );
      expect(secureAuth).toContain("ACCOUNT_PASSWORD_VAULT_NOTE");
      expect(ACCOUNT_PASSWORD_VAULT_NOTE).toMatch(/does not unlock your vault/i);
    });
  });
});
