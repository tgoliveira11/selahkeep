import { describe, it, expect, beforeEach } from "vitest";
import {
  generateUserVaultKey,
  wrapVaultKeyForRecovery,
  unwrapVaultKeyFromRecovery,
  isVaultUnlocked,
  setSessionVaultKey,
  getSessionVaultKey,
  generateDefaultNoteTitle,
  clearVaultClientState,
} from "@/lib/crypto-client/vault";
import { generateRecoveryCode } from "@/lib/crypto-client/recovery-code";
import { USER_ID } from "@/test/helpers/fixtures";

describe("vault key lifecycle", () => {
  beforeEach(() => {
    setSessionVaultKey(null);
  });

  it("tracks unlocked state in session memory", async () => {
    expect(isVaultUnlocked()).toBe(false);
    const key = await generateUserVaultKey();
    setSessionVaultKey(key);
    expect(isVaultUnlocked()).toBe(true);
    expect(getSessionVaultKey()).toBe(key);
  });

  it("wraps and unwraps recovery envelope", async () => {
    const vaultKey = await generateUserVaultKey();
    const code = generateRecoveryCode();
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecovery(
      vaultKey,
      code,
      USER_ID,
      USER_ID
    );
    setSessionVaultKey(null);
    const restored = await unwrapVaultKeyFromRecovery(code, encryptedVaultKey, kdfMetadata);
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
  });

  it("unwraps recovery envelope without applying session unlock", async () => {
    const vaultKey = await generateUserVaultKey();
    const code = generateRecoveryCode();
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecovery(
      vaultKey,
      code,
      USER_ID,
      USER_ID
    );
    setSessionVaultKey(null);
    const restored = await unwrapVaultKeyFromRecovery(code, encryptedVaultKey, kdfMetadata, {
      applySession: false,
    });
    expect(await crypto.subtle.exportKey("raw", restored)).toEqual(
      await crypto.subtle.exportKey("raw", vaultKey)
    );
    expect(isVaultUnlocked()).toBe(false);
  });

  it("unwraps recovery envelope and applies session unlock", async () => {
    const vaultKey = await generateUserVaultKey();
    const code = generateRecoveryCode();
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecovery(
      vaultKey,
      code,
      USER_ID,
      USER_ID
    );
    setSessionVaultKey(null);
    const { lockVaultSessionManually, hasUnlockedVaultSession } = await import(
      "@/lib/crypto-client/vault-session"
    );
    lockVaultSessionManually();
    await unwrapVaultKeyFromRecovery(code, encryptedVaultKey, kdfMetadata, {
      applySession: true,
    });
    expect(hasUnlockedVaultSession()).toBe(true);
  });

  it("clearVaultClientState clears session vault key", async () => {
    const key = await generateUserVaultKey();
    setSessionVaultKey(key);
    await clearVaultClientState(USER_ID);
    expect(isVaultUnlocked()).toBe(false);
  });

  it("generateDefaultNoteTitle uses readable date format", () => {
    expect(generateDefaultNoteTitle()).toMatch(/^Note from /);
  });
});
