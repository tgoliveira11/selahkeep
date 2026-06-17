import { describe, it, expect } from "vitest";
import {
  generateUserVaultKey,
  VAULT_VERSION_V2,
  createEncryptedVaultSettings,
  createEmptyEncryptedVaultIndex,
} from "@/lib/crypto-client/vault";
import {
  wrapVaultKeyForPassword,
  wrapVaultKeyForRecoveryPhrase,
} from "@/lib/crypto-client/vault-envelope";

const userId = "550e8400-e29b-41d4-a716-446655440000";

describe("vault setup crypto integration", () => {
  it("creates password and recovery phrase envelopes without plaintext secrets in payload", async () => {
    const vaultPassword = "my-vault-passphrase-12";
    const phrase =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const vaultKey = await generateUserVaultKey();

    const passwordEnvelope = await wrapVaultKeyForPassword(vaultKey, vaultPassword, {
      userId,
      resourceId: userId,
    });
    const recoveryEnvelope = await wrapVaultKeyForRecoveryPhrase(vaultKey, phrase, {
      userId,
      resourceId: userId,
    });
    const encryptedVaultSettings = await createEncryptedVaultSettings(vaultKey, userId, {
      setupVersion: 1,
      recoveryPhraseLength: 12,
      unlockBehavior: "metadata_only",
    });
    const encryptedVaultIndex = await createEmptyEncryptedVaultIndex(vaultKey, userId);

    const apiPayload = {
      vaultVersion: VAULT_VERSION_V2,
      encryptedVaultSettings,
      encryptedVaultIndex,
      envelopes: [
        {
          method: "password",
          encryptedVaultKey: passwordEnvelope.encryptedVaultKey,
          kdfMetadata: passwordEnvelope.kdfMetadata,
        },
        {
          method: "recovery_phrase",
          encryptedVaultKey: recoveryEnvelope.encryptedVaultKey,
          kdfMetadata: recoveryEnvelope.kdfMetadata,
        },
      ],
    };

    const serialized = JSON.stringify(apiPayload);
    expect(serialized).not.toContain(vaultPassword);
    expect(serialized).not.toContain(phrase);
    expect(apiPayload.envelopes).toHaveLength(2);
    expect(apiPayload.encryptedVaultIndex.aad.field).toBe("vault_index");
    expect(apiPayload.encryptedVaultSettings.aad.field).toBe("vault_settings");
  });
});
