import {
  createRecoveryPhrase,
  normalizeRecoveryPhrase,
  validateRecoveryPhraseFormat,
  assertRecoveryPhraseConfirmation as assertRecoveryPhraseConfirmationCore,
  type RecoveryPhraseWordCount,
} from "@/modules/vault/core/envelopes/recovery-envelope";
import { RecoveryPhraseConfirmationError } from "@tgoliveira/vault-core";

export {
  normalizeRecoveryPhrase,
  validateRecoveryPhraseFormat,
  assertRecoveryPhraseUnlockInput,
  assertRecoveryPhraseWordConfirmation,
  pickRecoveryConfirmationIndices,
  getRecoveryConfirmationPromptCount,
  getRecoveryPhraseWordCount,
  parseRecoveryPhraseWordCount,
  DEFAULT_RECOVERY_PHRASE_WORD_COUNT,
  RECOVERY_PHRASE_WORDLIST_SOURCE,
  deriveRecoveryPhraseKey,
  deriveRecoveryPhraseKeyFromMetadata,
  type RecoveryPhraseWordCount,
} from "@/modules/vault/core/envelopes/recovery-envelope";

export { RecoveryPhraseConfirmationError } from "@tgoliveira/vault-core";

export type RecoveryPhraseLength = RecoveryPhraseWordCount;

/** @deprecated Prefer createRecoveryPhrase({ wordCount }) from vault-core. */
export function generateRecoveryPhrase(length: RecoveryPhraseLength): string {
  return createRecoveryPhrase({ wordCount: length });
}

export function getRecoveryPhraseEntropyBits(length: RecoveryPhraseLength): number {
  return length === 12 ? 128 : 256;
}

export function countRecoveryPhraseWords(phrase: string): number {
  const normalized = normalizeRecoveryPhrase(phrase);
  if (!normalized) return 0;
  return normalized.split(" ").length;
}

export function isValidRecoveryPhraseLength(length: number): length is RecoveryPhraseLength {
  return length === 12 || length === 24;
}

/** @deprecated Prefer assertRecoveryPhraseChallengeAnswers for setup word challenges. */
export function assertRecoveryPhraseConfirmation(
  originalPhrase: string,
  confirmationPhrase: string
): void {
  try {
    assertRecoveryPhraseConfirmationCore(originalPhrase, confirmationPhrase);
  } catch (error) {
    if (error instanceof Error) {
      throw new RecoveryPhraseConfirmationError(error.message);
    }
    throw error;
  }
}
