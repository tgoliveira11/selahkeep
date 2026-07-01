import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import {
  decryptField,
  importAesKey,
  userVaultKeysEqual,
  type EncryptedPayload as VaultCoreEncryptedPayload,
} from "@tgoliveira/vault-core";
import { getSessionVaultKey } from "./vault";
import { deriveRecoveryPhraseKeyFromMetadata } from "./recovery-phrase";
import { base64UrlToBytes } from "./encoding";

export type RecoveryDrillResult =
  | { status: "verified" }
  | { status: "mismatch" }
  | { status: "invalid_phrase" };

async function unwrapVaultKeyOnly(
  recoveryPhrase: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata
): Promise<CryptoKey> {
  if (kdfMetadata.kdf !== "argon2id") {
    throw new Error("Recovery phrase envelope requires Argon2id metadata");
  }
  const { encryptionKey: derivedKey } = await deriveRecoveryPhraseKeyFromMetadata(
    recoveryPhrase,
    kdfMetadata
  );
  const keyBytes = base64UrlToBytes(
    await decryptField(encryptedVaultKey as VaultCoreEncryptedPayload, derivedKey)
  );
  return importAesKey(keyBytes);
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
