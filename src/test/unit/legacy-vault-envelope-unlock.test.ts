import { describe, expect, it } from "vitest";
import {
  createPasswordEnvelope,
  createRecoveryEnvelope,
  createRecoveryPhrase,
  createUserVaultKey,
  isLegacyVaultKeyEnvelope,
} from "@tgoliveira/vault-core";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import {
  hasUnlockedVaultSession,
  lockVaultSessionManually,
  resetVaultSessionStoreForTests,
  lockVaultSession,
} from "@/lib/crypto-client/vault-session";
import {
  unwrapVaultKeyFromPassword,
  unwrapVaultKeyFromRecoveryPhrase,
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
    expect(isLegacyVaultKeyEnvelope(base, SELAHKEEP_VAULT_PROFILE)).toBe(true);
    expect(
      isLegacyVaultKeyEnvelope({ ...base, aad: { ...base.aad, context: null } }, SELAHKEEP_VAULT_PROFILE)
    ).toBe(true);
    expect(
      isLegacyVaultKeyEnvelope(
        {
          ...base,
          aad: { ...base.aad, context: SELAHKEEP_VAULT_PROFILE.aadContextEnvelope },
        },
        SELAHKEEP_VAULT_PROFILE
      )
    ).toBe(false);
  });

  it("marks envelopes without profile context as legacy", async () => {
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

    expect(isLegacyVaultKeyEnvelope(legacy, SELAHKEEP_VAULT_PROFILE)).toBe(true);
    await expect(
      unwrapVaultKeyFromPassword("wrong-password", legacy, kdfMetadata, {
        userId: USER_ID,
        resourceId: USER_ID,
        applySession: false,
      })
    ).rejects.toThrow();
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

    await unwrapVaultKeyFromPassword(password, encryptedVaultKey, kdfMetadata, {
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
      unwrapVaultKeyFromPassword("wrong-password", legacy, kdfMetadata, {
        userId: USER_ID,
        resourceId: USER_ID,
        applySession: false,
      })
    ).rejects.toThrow();
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
      unwrapVaultKeyFromPassword(
        "password",
        envelope.encryptedVaultKey,
        { ...envelope.kdfMetadata, kdf: "pbkdf2" as "argon2id" },
        { userId: USER_ID, resourceId: USER_ID, applySession: false }
      )
    ).rejects.toThrow("Vault password envelope requires Argon2id metadata");
  });

  it("marks recovery envelopes without profile context as legacy", () => {
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
    expect(isLegacyVaultKeyEnvelope(base, SELAHKEEP_VAULT_PROFILE)).toBe(true);
  });

  it("rejects incorrect recovery phrase on legacy envelopes", async () => {
    const vaultKey = await createUserVaultKey();
    const phrase = createRecoveryPhrase({ wordCount: 12 });
    const { envelope, kdfMetadata } = await createRecoveryEnvelope(
      vaultKey,
      phrase,
      { userId: USER_ID, resourceId: USER_ID },
      SELAHKEEP_VAULT_PROFILE
    );
    const legacy = structuredClone(envelope.encryptedVaultKey) as typeof envelope.encryptedVaultKey;
    delete (legacy.aad as { context?: string }).context;

    await expect(
      unwrapVaultKeyFromRecoveryPhrase(
        createRecoveryPhrase({ wordCount: 12 }),
        legacy,
        kdfMetadata,
        { userId: USER_ID, resourceId: USER_ID, applySession: false }
      )
    ).rejects.toThrow();
  });
});
