import { describe, expect, it } from "vitest";
import { createPasswordEnvelope, createUserVaultKey, userVaultKeysEqual } from "@tgoliveira/vault-core";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import {
  assertLegacyVaultKeyScope,
  isLegacyVaultKeyEnvelope,
  unwrapLegacyVaultKeyFromPasskey,
  unwrapLegacyVaultKeyFromPassword,
  unwrapLegacyVaultKeyFromRecoveryPhrase,
} from "@/modules/vault/core/envelopes/legacy-envelope-unlock";
import { hasUnlockedVaultSession, lockVaultSessionManually, resetVaultSessionStoreForTests, lockVaultSession } from "@/lib/crypto-client/vault-session";
import {
  unwrapVaultKeyFromPassword,
  wrapVaultKeyForPassword,
} from "@/lib/crypto-client/vault-envelope";

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
    expect(await userVaultKeysEqual(vaultKey, restored)).toBe(true);
  });

  it("password unlock after manual lock updates global session store", async () => {
    resetVaultSessionStoreForTests();
    lockVaultSession();
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

  it("rejects non-argon2id metadata for password unlock", async () => {
    const vaultKey = await createUserVaultKey();
    const { envelope } = await createPasswordEnvelope(
      vaultKey,
      "password",
      { userId: USER_ID, resourceId: USER_ID },
      SELAHKEEP_VAULT_PROFILE
    );
    await expect(
      unwrapLegacyVaultKeyFromPassword(
        "password",
        envelope.encryptedVaultKey,
        { ...envelope.kdfMetadata, kdf: "pbkdf2" as "argon2id" },
        { userId: USER_ID, resourceId: USER_ID }
      )
    ).rejects.toThrow("Vault password envelope requires Argon2id metadata");
  });

  it("assertLegacyVaultKeyScope rejects mismatched AAD", () => {
    const payload = {
      version: "enc-v1" as const,
      alg: "AES-GCM" as const,
      iv: "aXY",
      ciphertext: "Y2lwaGVydGV4dA",
      aad: {
        userId: "other-user",
        resourceId: USER_ID,
        field: "vault_key" as const,
      },
    };
    expect(() =>
      assertLegacyVaultKeyScope({ userId: USER_ID, resourceId: USER_ID }, payload)
    ).toThrow("Vault key AAD userId mismatch");
  });

  it("unwraps legacy envelopes with recovery phrase", async () => {
    const vaultKey = await createUserVaultKey();
    const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const { envelope, kdfMetadata } = await createPasswordEnvelope(
      vaultKey,
      phrase,
      { userId: USER_ID, resourceId: USER_ID },
      SELAHKEEP_VAULT_PROFILE
    );
    const legacy = structuredClone(envelope.encryptedVaultKey) as typeof envelope.encryptedVaultKey;
    delete (legacy.aad as { context?: string }).context;

    const restored = await unwrapLegacyVaultKeyFromRecoveryPhrase(
      phrase,
      legacy,
      kdfMetadata,
      { userId: USER_ID, resourceId: USER_ID }
    );
    expect(await userVaultKeysEqual(vaultKey, restored)).toBe(true);
  });

  it("unwraps legacy envelopes with passkey PRF output", async () => {
    const vaultKey = await createUserVaultKey();
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const { envelope } = await createPasswordEnvelope(
      vaultKey,
      "unused-password",
      { userId: USER_ID, resourceId: USER_ID },
      SELAHKEEP_VAULT_PROFILE
    );
    const legacy = structuredClone(envelope.encryptedVaultKey) as typeof envelope.encryptedVaultKey;
    delete (legacy.aad as { context?: string }).context;

    await expect(
      unwrapLegacyVaultKeyFromPasskey(legacy, new Uint8Array(16), {
        userId: USER_ID,
        resourceId: USER_ID,
      })
    ).rejects.toThrow("PRF output must be at least 32 bytes");

    await expect(
      unwrapLegacyVaultKeyFromPasskey(legacy, prfOutput, {
        userId: USER_ID,
        resourceId: USER_ID,
      })
    ).rejects.toThrow("Could not decrypt your vault with this passkey");
  });
});
