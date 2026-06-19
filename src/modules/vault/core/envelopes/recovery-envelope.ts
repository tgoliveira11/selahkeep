import {
  createRecoveryEnvelope,
  unlockWithRecoveryEnvelope,
  type Argon2idKdfMetadata as VaultCoreArgon2idKdfMetadata,
  type EncryptedPayload as VaultCoreEncryptedPayload,
  type KdfMetadata as VaultCoreKdfMetadata,
} from "@tgoliveira/vault-core";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";
import {
  setUnlockedVaultSession,
  type VaultUnlockMethod,
} from "@/lib/crypto-client/vault-session";
import { SELAHKEEP_VAULT_PROFILE } from "../../selahkeep-profile";
import {
  isLegacyVaultKeyEnvelope,
  unwrapLegacyVaultKeyFromRecoveryPhrase,
} from "./legacy-envelope-unlock";

type WrapOptions = {
  userId: string;
  resourceId: string;
};

function asVaultCorePayload(payload: EncryptedPayload): VaultCoreEncryptedPayload {
  return payload as VaultCoreEncryptedPayload;
}

function envelopeScope(userId: string, resourceId?: string) {
  return { userId, resourceId: resourceId ?? userId };
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
  options?: {
    applySession?: boolean;
    unlockMethod?: VaultUnlockMethod;
    userId?: string;
    resourceId?: string;
    expectedWordCount?: 12 | 24 | null;
  }
): Promise<CryptoKey> {
  const scope = envelopeScope(options?.userId ?? encryptedVaultKey.aad.userId, options?.resourceId);
  const vaultKey = isLegacyVaultKeyEnvelope(encryptedVaultKey)
    ? await unwrapLegacyVaultKeyFromRecoveryPhrase(
        recoveryPhrase,
        encryptedVaultKey,
        kdfMetadata,
        scope
      )
    : await unlockWithRecoveryEnvelope(
        recoveryPhrase,
        {
          method: "recovery_phrase",
          encryptedVaultKey: asVaultCorePayload(encryptedVaultKey),
          kdfMetadata: kdfMetadata as VaultCoreKdfMetadata,
        },
        { expectedWordCount: options?.expectedWordCount ?? null }
      );

  if (options?.applySession ?? true) {
    setUnlockedVaultSession({
      userVaultKey: vaultKey,
      method: options?.unlockMethod ?? "recovery_phrase",
    });
  }
  return vaultKey;
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
