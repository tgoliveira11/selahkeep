import { describe, expect, it } from "vitest";
import { createPasswordEnvelope, createUserVaultKey } from "@tgoliveira/vault-core";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import {
  isLegacyVaultKeyEnvelope,
  unwrapLegacyVaultKeyFromPassword,
} from "@/modules/vault/core/envelopes/legacy-envelope-unlock";
import {
  hasUnlockedVaultSession,
  lockVaultSessionManually,
  resetVaultSessionStoreForTests,
  setSessionVaultKey,
} from "@/lib/crypto-client/vault-session";
import {
  unwrapVaultKeyFromPassword,
  wrapVaultKeyForPassword,
} from "@/lib/crypto-client/vault-envelope";
import { exportAesKey } from "@/lib/crypto-client/aes-gcm";

const USER_ID = "00000000-0000-4000-8000-000000000001";

describe("legacy vault envelope unlock", () => {
  it("detects missing and null AAD context as legacy", () => {
    const base = {
      version: "enc-v1" as const,
      alg: "AES-GCM" as const,
      iv: "aXY",
      ciphertext: "Y2lwaGVydGV4dA",
      aad: {
        userId: USER_ID,
        resourceId: USER_ID,
        field: "vault_key" as const,
      },
    };
    expect(isLegacyVaultKeyEnvelope(base)).toBe(true);
    expect(isLegacyVaultKeyEnvelope({ ...base, aad: { ...base.aad, context: null } })).toBe(
      true
    );
    expect(
      isLegacyVaultKeyEnvelope({
        ...base,
        aad: { ...base.aad, context: SELAHKEEP_VAULT_PROFILE.aadContextEnvelope },
      })
    ).toBe(false);
  });

  it("unwraps legacy envelopes without stored context", async () => {
    resetVaultSessionStoreForTests();
    const vaultKey = await createUserVaultKey();
    const password = "correct-horse-battery-staple";
    const { envelope, kdfMetadata } = await createPasswordEnvelope(
      vaultKey,
      password,
      { userId: USER_ID, resourceId: USER_ID },
      SELAHKEEP_VAULT_PROFILE
    );
    const legacy = structuredClone(envelope.encryptedVaultKey) as typeof envelope.encryptedVaultKey;
    delete (legacy.aad as { context?: string }).context;

    const restored = await unwrapLegacyVaultKeyFromPassword(
      password,
      legacy,
      kdfMetadata,
      { userId: USER_ID, resourceId: USER_ID }
    );
    const a = new Uint8Array(await exportAesKey(vaultKey));
    const b = new Uint8Array(await exportAesKey(restored));
    expect(a).toEqual(b);
  });

  it("password unlock after manual lock updates global session store", async () => {
    resetVaultSessionStoreForTests();
    setSessionVaultKey(null);
    lockVaultSessionManually();
    expect(hasUnlockedVaultSession()).toBe(false);

    const vaultKey = await createUserVaultKey();
    const password = "vault-password-with-legacy-path";
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(vaultKey, password, {
      userId: USER_ID,
      resourceId: USER_ID,
    });

    const legacy = structuredClone(encryptedVaultKey);
    delete (legacy.aad as { context?: string }).context;

    await unwrapVaultKeyFromPassword(password, legacy, kdfMetadata, {
      applySession: true,
      unlockMethod: "password",
      userId: USER_ID,
    });

    expect(hasUnlockedVaultSession()).toBe(true);
  });

  it("rejects incorrect vault password on legacy envelopes", async () => {
    const vaultKey = await createUserVaultKey();
    const { envelope, kdfMetadata } = await createPasswordEnvelope(
      vaultKey,
      "right-password",
      { userId: USER_ID, resourceId: USER_ID },
      SELAHKEEP_VAULT_PROFILE
    );
    const legacy = structuredClone(envelope.encryptedVaultKey) as typeof envelope.encryptedVaultKey;
    delete (legacy.aad as { context?: string }).context;

    await expect(
      unwrapLegacyVaultKeyFromPassword("wrong-password", legacy, kdfMetadata, {
        userId: USER_ID,
        resourceId: USER_ID,
      })
    ).rejects.toThrow("Incorrect vault password");
  });
});
