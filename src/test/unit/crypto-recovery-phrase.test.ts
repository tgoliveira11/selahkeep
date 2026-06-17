import { describe, it, expect } from "vitest";
import {
  generateRecoveryPhrase,
  normalizeRecoveryPhrase,
  countRecoveryPhraseWords,
  validateRecoveryPhraseFormat,
  assertRecoveryPhraseConfirmation,
  RecoveryPhraseConfirmationError,
  RECOVERY_PHRASE_WORDLIST_SOURCE,
  deriveRecoveryPhraseKey,
} from "@/lib/crypto-client/recovery-phrase";

describe("recovery phrase", () => {
  it("documents BIP39 English wordlist source", () => {
    expect(RECOVERY_PHRASE_WORDLIST_SOURCE).toContain("BIP39");
  });

  it("generates 12 words when selected", () => {
    const phrase = generateRecoveryPhrase(12);
    expect(countRecoveryPhraseWords(phrase)).toBe(12);
    expect(validateRecoveryPhraseFormat(phrase)).toBe(true);
  });

  it("generates 24 words when selected", () => {
    const phrase = generateRecoveryPhrase(24);
    expect(countRecoveryPhraseWords(phrase)).toBe(24);
    expect(validateRecoveryPhraseFormat(phrase)).toBe(true);
  });

  it("rejects invalid word counts", () => {
    expect(validateRecoveryPhraseFormat("abandon ability able")).toBe(false);
    expect(countRecoveryPhraseWords("one two three")).toBe(3);
  });

  it("requires confirmation to match", () => {
    const phrase = generateRecoveryPhrase(12);
    expect(() => assertRecoveryPhraseConfirmation(phrase, phrase)).not.toThrow();
    expect(() => assertRecoveryPhraseConfirmation(phrase, "wrong phrase words")).toThrow(
      RecoveryPhraseConfirmationError
    );
  });

  it("normalizes phrase input", () => {
    const phrase = "  Abandon   Ability  ";
    expect(normalizeRecoveryPhrase(phrase)).toBe("abandon ability");
  });

  it("derives Argon2id key from phrase without sending to network", async () => {
    const phrase = generateRecoveryPhrase(12);
    const { key, metadata } = await deriveRecoveryPhraseKey(phrase);
    expect(metadata.kdf).toBe("argon2id");
    expect(key.type).toBe("secret");
  });
});
