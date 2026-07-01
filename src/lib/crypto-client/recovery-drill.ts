import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import {
  unlockWithRecoveryEnvelope,
  userVaultKeysEqual,
  type EncryptedPayload as VaultCoreEncryptedPayload,
  type KdfMetadata as VaultCoreKdfMetadata,
} from "@tgoliveira/vault-core";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import { getSessionVaultKey } from "./vault";

export type RecoveryDrillResult =
  | { status: "verified" }
  | { status: "mismatch" }
  | { status: "invalid_phrase" };

async function unwrapVaultKeyOnly(
  recoveryPhrase: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata
): Promise<CryptoKey> {
  const scope = {
    userId: encryptedVaultKey.aad.userId,
    resourceId: encryptedVaultKey.aad.resourceId ?? encryptedVaultKey.aad.userId,
  };
  return unlockWithRecoveryEnvelope(
    recoveryPhrase,
    {
      method: "recovery_phrase",
      encryptedVaultKey: encryptedVaultKey as VaultCoreEncryptedPayload,
      kdfMetadata: kdfMetadata as VaultCoreKdfMetadata,
    },
    scope,
    SELAHKEEP_VAULT_PROFILE
  );
}

async function cryptoKeysEqual(a: CryptoKey, b: CryptoKey): Promise<boolean> {
  return userVaultKeysEqual(a, b);
}

/**
 * Verify a recovery phrase against the encrypted envelope without rotating envelopes
 * or leaving the vault unlocked when it was locked before the drill.
 */
export async function verifyRecoveryPhraseDrill(
  recoveryPhrase: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  options?: { vaultCurrentlyUnlocked?: boolean }
): Promise<RecoveryDrillResult> {
  const vaultWasUnlocked = options?.vaultCurrentlyUnlocked ?? false;
  const sessionKeyBefore = vaultWasUnlocked ? getSessionVaultKey() : null;

  try {
    const derivedKey = await unwrapVaultKeyOnly(recoveryPhrase, encryptedVaultKey, kdfMetadata);

    if (sessionKeyBefore) {
      const matches = await cryptoKeysEqual(derivedKey, sessionKeyBefore);
      return matches ? { status: "verified" } : { status: "mismatch" };
    }

    // Vault was locked: unwrap-only proves the phrase decrypts the envelope.
    return { status: "verified" };
  } catch {
    return { status: "invalid_phrase" };
  }
}
