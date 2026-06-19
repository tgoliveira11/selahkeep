import type { RecoveryPhraseLength } from "@/lib/crypto-client/recovery-phrase";
import {
  assertRecoveryPhraseWordConfirmation,
  RecoveryPhraseConfirmationError,
} from "@/lib/crypto-client/recovery-phrase";

export const RECOVERY_PHRASE_CHALLENGE_WORD_COUNT: Record<RecoveryPhraseLength, number> = {
  12: 3,
  24: 6,
};

export const RECOVERY_PHRASE_CHALLENGE_MISMATCH_MESSAGE =
  "Some words do not match. Check your recovery phrase and try again.";

type RandomIntFn = (maxExclusive: number) => number;

function defaultRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error("Invalid random range");
  }
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return bytes[0]! % maxExclusive;
}

/** Picks unique 1-based word positions for setup confirmation (crypto-safe by default). */
export function pickRecoveryPhraseChallengeIndices(
  wordCount: RecoveryPhraseLength,
  randomInt: RandomIntFn = defaultRandomInt
): number[] {
  const count = RECOVERY_PHRASE_CHALLENGE_WORD_COUNT[wordCount];
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(randomInt(wordCount) + 1);
  }
  return [...indices].sort((a, b) => a - b);
}

export function assertRecoveryPhraseChallengeAnswers(
  originalPhrase: string,
  answers: Record<number, string>,
  requiredIndices: readonly number[]
): void {
  try {
    assertRecoveryPhraseWordConfirmation(originalPhrase, answers, requiredIndices);
  } catch (error) {
    if (error instanceof RecoveryPhraseConfirmationError) {
      throw new RecoveryPhraseConfirmationError(RECOVERY_PHRASE_CHALLENGE_MISMATCH_MESSAGE);
    }
    throw error;
  }
}
