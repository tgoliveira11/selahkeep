import { describe, it, expect, beforeEach } from "vitest";
import {
  assertUserVaultKeyNonExtractable,
  createUserVaultKey,
  importUserVaultKey,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import {
  wrapVaultKeyForPassword,
  unwrapVaultKeyFromPassword,
} from "@/lib/crypto-client/vault-envelope";
import {
  wrapVaultKeyForPasskey,
  unwrapVaultKeyFromPasskey,
} from "@/lib/crypto-client/passkey-vault";
import { setUnlockedVaultSession, resetVaultSessionStoreForTests, getSessionVaultKey } from "@/lib/crypto-client/vault-session";
import {
  clearVaultInnerKeyMaterial,
  getCachedVaultInnerKeyMaterial,
} from "@/modules/vault/core/envelopes/vault-inner-key-material";
import { PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE } from "@/lib/passkey/messages";
import { USER_ID } from "@/test/helpers/fixtures";

describe("vault inner key material for passkey re-wrap", () => {
  beforeEach(() => {
    clearVaultInnerKeyMaterial();
    resetVaultSessionStoreForTests();
  });

  it("caches inner material when unlocking with vault password", async () => {
    const vaultKey = await createUserVaultKey();
    const password = "correct-horse-battery-staple-vault";
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(vaultKey, password, {
      userId: USER_ID,
      resourceId: USER_ID,
    });

    await unwrapVaultKeyFromPassword(password, encryptedVaultKey, kdfMetadata, {
      applySession: false,
    });

    expect(getCachedVaultInnerKeyMaterial()).not.toBeNull();
  });

  it("wraps passkey envelope for non-extractable session UVK after password unlock", async () => {
    const vaultKey = await createUserVaultKey();
    const password = "correct-horse-battery-staple-vault";
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(vaultKey, password, {
      userId: USER_ID,
      resourceId: USER_ID,
    });

    const unlockedKey = await unwrapVaultKeyFromPassword(
      password,
      encryptedVaultKey,
      kdfMetadata,
      { applySession: false }
    );
    await setUnlockedVaultSession({ userVaultKey: unlockedKey, method: "password" });

    const sessionKey = unlockedKey;
    await assertUserVaultKeyNonExtractable(sessionKey);

    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const passkeyEnvelope = await wrapVaultKeyForPasskey(
      sessionKey,
      prfOutput,
      USER_ID,
      USER_ID
    );
    const restored = await unwrapVaultKeyFromPasskey(passkeyEnvelope, prfOutput, {
      applySession: false,
    });
    expect(await userVaultKeysEqual(restored, vaultKey)).toBe(true);
  });

  it("wraps passkey envelope after fresh vault setup without password re-unlock", async () => {
    const vaultKey = await createUserVaultKey();
    await setUnlockedVaultSession({ userVaultKey: vaultKey, method: "password" });

    const sessionKey = getSessionVaultKey();
    expect(sessionKey).toBeTruthy();
    expect(getCachedVaultInnerKeyMaterial()).not.toBeNull();

    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const passkeyEnvelope = await wrapVaultKeyForPasskey(
      sessionKey!,
      prfOutput,
      USER_ID,
      USER_ID
    );
    const restored = await unwrapVaultKeyFromPasskey(passkeyEnvelope, prfOutput, {
      applySession: false,
    });
    expect(await userVaultKeysEqual(restored, vaultKey)).toBe(true);
  });

  it("rejects passkey wrap without cached inner material on non-extractable UVK", async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const extractableKey = await importUserVaultKey(raw, { extractable: true });
    const sessionKey = await importUserVaultKey(raw, { extractable: false });
    void extractableKey;

    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    await expect(
      wrapVaultKeyForPasskey(sessionKey, prfOutput, USER_ID, USER_ID)
    ).rejects.toThrow(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE);
  });
});
