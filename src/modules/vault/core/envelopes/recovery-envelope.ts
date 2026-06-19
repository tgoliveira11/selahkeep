import {
  createRecoveryEnvelope,
  unlockWithRecoveryEnvelope,
  type Argon2idKdfMetadata as VaultCoreArgon2idKdfMetadata,
  type EncryptedPayload as VaultCoreEncryptedPayload,
  type KdfMetadata as VaultCoreKdfMetadata,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import { unlockVaultSession } from "../../client/vault-session";
import { setSessionVaultKey } from "../vault-key";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";

type WrapOptions = {
  userId: string;
  resourceId: string;
};

function asVaultCorePayload(payload: EncryptedPayload): VaultCoreEncryptedPayload {
  return payload as VaultCoreEncryptedPayload;
}

function applyUnlockedVaultKey(vaultKey: CryptoKey, explicit?: boolean): CryptoKey {
  if (explicit ?? true) {
    unlockVaultSession(vaultKey);
  } else {
    setSessionVaultKey(vaultKey);
  }
  return vaultKey;
}

export async function wrapVaultKeyForRecoveryPhrase(
  vaultKey: CryptoKey,
  recoveryPhrase: string,
  options: WrapOptions,
  publicMetadata?: { phraseLength: 12 | 24 }
): Promise<{ encryptedVaultKey: EncryptedPayload; kdfMetadata: VaultCoreArgon2idKdfMetadata }> {
  const { envelope, kdfMetadata } = await createRecoveryEnvelope(
    vaultKey,
    recoveryPhrase,
    options,
    SELAHKEEP_VAULT_PROFILE,
    publicMetadata
  );
  return {
    encryptedVaultKey: envelope.encryptedVaultKey as EncryptedPayload,
    kdfMetadata,
  };
}

export async function unwrapVaultKeyFromRecoveryPhrase(
  recoveryPhrase: string,
  encryptedVaultKey: EncryptedPayload,
  kdfMetadata: KdfMetadata,
  options?: { explicit?: boolean; expectedWordCount?: 12 | 24 | null }
): Promise<CryptoKey> {
  const vaultKey = await unlockWithRecoveryEnvelope(
    recoveryPhrase,
    {
      method: "recovery_phrase",
      encryptedVaultKey: asVaultCorePayload(encryptedVaultKey),
      kdfMetadata: kdfMetadata as VaultCoreKdfMetadata,
    },
    { expectedWordCount: options?.expectedWordCount ?? null }
  );
  return applyUnlockedVaultKey(vaultKey, options?.explicit);
}

export {
  createRecoveryPhrase,
  generateRecoveryPhrase,
  normalizeRecoveryPhrase,
  validateRecoveryPhraseFormat,
  assertRecoveryPhraseConfirmation,
  assertRecoveryPhraseWordConfirmation,
  assertRecoveryPhraseUnlockInput,
  pickRecoveryConfirmationIndices,
  getRecoveryConfirmationPromptCount,
  getRecoveryPhraseWordCount,
  parseRecoveryPhraseWordCount,
  DEFAULT_RECOVERY_PHRASE_WORD_COUNT,
  RECOVERY_PHRASE_WORDLIST_SOURCE,
  deriveRecoveryPhraseKey,
  deriveRecoveryPhraseKeyFromMetadata,
  type RecoveryPhraseWordCount,
  createRecoveryEnvelope,
  unlockWithRecoveryEnvelope,
} from "@tgoliveira/vault-core";

/** @deprecated Use RecoveryPhraseWordCount */
export type RecoveryPhraseLength = import("@tgoliveira/vault-core").RecoveryPhraseWordCount;

export type { VaultCoreArgon2idKdfMetadata as Argon2idKdfMetadata };
