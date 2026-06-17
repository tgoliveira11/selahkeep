import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { stringToBytes } from "./encoding";
import {
  DEFAULT_ARGON2ID_PARAMS,
  deriveArgon2idAesKey,
  deriveArgon2idAesKeyFromMetadata,
  serializeArgon2idMetadata,
  type Argon2idKdfMetadata,
} from "./argon2id";

export const RECOVERY_PHRASE_WORDLIST_SOURCE = "BIP39 English (BIP-0039)" as const;

export type RecoveryPhraseLength = 12 | 24;

const STRENGTH_BITS: Record<RecoveryPhraseLength, 128 | 256> = {
  12: 128,
  24: 256,
};

export function getRecoveryPhraseEntropyBits(length: RecoveryPhraseLength): number {
  return STRENGTH_BITS[length];
}

/** Generate a BIP39 recovery phrase with 12 or 24 words. */
export function generateRecoveryPhrase(length: RecoveryPhraseLength): string {
  const strength = STRENGTH_BITS[length];
  return generateMnemonic(wordlist, strength);
}

export function normalizeRecoveryPhrase(phrase: string): string {
  return phrase
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export function countRecoveryPhraseWords(phrase: string): number {
  const normalized = normalizeRecoveryPhrase(phrase);
  if (!normalized) return 0;
  return normalized.split(" ").length;
}

export function isValidRecoveryPhraseLength(length: number): length is RecoveryPhraseLength {
  return length === 12 || length === 24;
}

export function validateRecoveryPhraseFormat(phrase: string): boolean {
  const normalized = normalizeRecoveryPhrase(phrase);
  if (!normalized) return false;
  const words = normalized.split(" ");
  if (!isValidRecoveryPhraseLength(words.length)) return false;
  return validateMnemonic(normalized, wordlist);
}

export function assertRecoveryPhraseConfirmation(
  originalPhrase: string,
  confirmationPhrase: string
): void {
  const a = normalizeRecoveryPhrase(originalPhrase);
  const b = normalizeRecoveryPhrase(confirmationPhrase);
  if (a !== b) {
    throw new RecoveryPhraseConfirmationError("Recovery phrase confirmation does not match");
  }
  if (!validateRecoveryPhraseFormat(a)) {
    throw new RecoveryPhraseConfirmationError("Recovery phrase is not valid");
  }
}

export class RecoveryPhraseConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoveryPhraseConfirmationError";
  }
}

/** Derive envelope key from recovery phrase (Argon2id only — no PBKDF2 fallback). */
export async function deriveRecoveryPhraseKey(
  phrase: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; metadata: Argon2idKdfMetadata }> {
  const normalized = normalizeRecoveryPhrase(phrase);
  if (!validateRecoveryPhraseFormat(normalized)) {
    throw new Error("Invalid recovery phrase");
  }
  // Ensure mnemonic entropy is valid before KDF
  mnemonicToEntropy(normalized, wordlist);

  const saltBytes = salt ?? crypto.getRandomValues(new Uint8Array(DEFAULT_ARGON2ID_PARAMS.saltLength));
  const passwordBytes = stringToBytes(normalized);
  const key = await deriveArgon2idAesKey(passwordBytes, saltBytes);
  return {
    key,
    metadata: serializeArgon2idMetadata(saltBytes),
  };
}

export async function deriveRecoveryPhraseKeyFromMetadata(
  phrase: string,
  metadata: Argon2idKdfMetadata
): Promise<CryptoKey> {
  const normalized = normalizeRecoveryPhrase(phrase);
  if (!validateRecoveryPhraseFormat(normalized)) {
    throw new Error("Invalid recovery phrase");
  }
  return deriveArgon2idAesKeyFromMetadata(stringToBytes(normalized), metadata);
}
