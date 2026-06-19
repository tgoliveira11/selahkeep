import { describe, it, expect } from "vitest";
import { generateUserVaultKey, VAULT_VERSION_V2 } from "@/lib/crypto-client/vault";
import {
  wrapVaultKeyForPassword,
  unwrapVaultKeyFromPassword,
  wrapVaultKeyForRecoveryPhrase,
  unwrapVaultKeyFromRecoveryPhrase,
} from "@/lib/crypto-client/vault-envelope";
import { generateRecoveryPhrase } from "@/lib/crypto-client/recovery-phrase";
import { exportAesKey } from "@/lib/crypto-client/aes-gcm";

const userId = "00000000-0000-4000-8000-000000000001";

describe("vault envelopes (LTG Phase 1)", () => {
  it("generates User Vault Key client-side", async () => {
    const key = await generateUserVaultKey();
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("wraps and unwraps UVK with vault password envelope", async () => {
    const vaultKey = await generateUserVaultKey();
    const password = "correct-horse-battery-staple-vault";
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(vaultKey, password, {
      userId,
      resourceId: userId,
    });
    expect(kdfMetadata.kdf).toBe("argon2id");

    const unwrapped = await unwrapVaultKeyFromPassword(password, encryptedVaultKey, kdfMetadata, {
      applySession: false,
    });
    const a = new Uint8Array(await exportAesKey(vaultKey));
    const b = new Uint8Array(await exportAesKey(unwrapped));
    expect(a).toEqual(b);
  });

  it("wraps and unwraps UVK with recovery phrase envelope", async () => {
    const vaultKey = await generateUserVaultKey();
    const phrase = generateRecoveryPhrase(12);
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecoveryPhrase(
      vaultKey,
      phrase,
      { userId, resourceId: userId }
    );
    const unwrapped = await unwrapVaultKeyFromRecoveryPhrase(
      phrase,
      encryptedVaultKey,
      kdfMetadata,
      { applySession: false }
    );
    const a = new Uint8Array(await exportAesKey(vaultKey));
    const b = new Uint8Array(await exportAesKey(unwrapped));
    expect(a).toEqual(b);
  });

  it("wrong vault password fails unwrap", async () => {
    const vaultKey = await generateUserVaultKey();
    const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForPassword(
      vaultKey,
      "right-password-here",
      { userId, resourceId: userId }
    );
    await expect(
      unwrapVaultKeyFromPassword("wrong-password", encryptedVaultKey, kdfMetadata, {
        applySession: false,
      })
    ).rejects.toThrow();
  });

  it("uses vault-v2 version constant for LTG setup", () => {
    expect(VAULT_VERSION_V2).toBe("vault-v2");
  });
});
