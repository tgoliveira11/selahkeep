import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { getSessionVaultKey } from "./vault";
import type { RecoveryPhraseLength } from "./recovery-phrase";

export type VaultUnlockBehavior = "metadata_only" | "decrypt_all";

export type VaultSettingsPlaintext = {
  setupVersion: 1;
  recoveryPhraseLength: RecoveryPhraseLength;
  unlockBehavior: VaultUnlockBehavior;
};

export function defaultVaultSettings(
  recoveryPhraseLength: RecoveryPhraseLength = 12
): VaultSettingsPlaintext {
  return {
    setupVersion: 1,
    recoveryPhraseLength,
    unlockBehavior: "metadata_only",
  };
}

export function normalizeVaultSettings(
  settings: Partial<VaultSettingsPlaintext> & { setupVersion: 1 }
): VaultSettingsPlaintext {
  return {
    setupVersion: 1,
    recoveryPhraseLength: settings.recoveryPhraseLength ?? 12,
    unlockBehavior: settings.unlockBehavior ?? "metadata_only",
  };
}

export async function encryptVaultSettings(
  settings: VaultSettingsPlaintext,
  userId: string,
  vaultKey?: CryptoKey
): Promise<EncryptedPayload> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  return encryptField(JSON.stringify(settings), key, {
    userId,
    resourceId: userId,
    field: "vault_settings",
  });
}

export async function decryptVaultSettings(
  encryptedVaultSettings: EncryptedPayload,
  expectedUserId: string,
  vaultKey?: CryptoKey
): Promise<VaultSettingsPlaintext> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  verifyPayloadAad(encryptedVaultSettings, {
    userId: expectedUserId,
    resourceId: expectedUserId,
    field: "vault_settings",
  });

  const json = await decryptField(encryptedVaultSettings, key);
  const parsed = JSON.parse(json) as Partial<VaultSettingsPlaintext>;
  if (parsed.setupVersion !== 1) {
    throw new Error("Invalid vault settings format");
  }

  return normalizeVaultSettings(parsed as VaultSettingsPlaintext);
}
