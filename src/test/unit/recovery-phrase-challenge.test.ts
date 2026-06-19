import { describe, it, expect } from "vitest";
import {
  RECOVERY_PHRASE_CHALLENGE_WORD_COUNT,
  pickRecoveryPhraseChallengeIndices,
  assertRecoveryPhraseChallengeAnswers,
  RECOVERY_PHRASE_CHALLENGE_MISMATCH_MESSAGE,
} from "@/lib/crypto-client/recovery-phrase-challenge";
import { generateRecoveryPhrase } from "@/lib/crypto-client/recovery-phrase";

describe("recovery phrase challenge", () => {
  it("asks for 3 unique positions on 12-word phrases", () => {
    let counter = 0;
    const indices = pickRecoveryPhraseChallengeIndices(12, (max) => {
      counter += 1;
      return (counter - 1) % max;
    });
    expect(indices).toHaveLength(RECOVERY_PHRASE_CHALLENGE_WORD_COUNT[12]);
    expect(new Set(indices).size).toBe(3);
    expect(indices.every((index) => index >= 1 && index <= 12)).toBe(true);
  });

  it("asks for 6 unique positions on 24-word phrases", () => {
    let counter = 0;
    const indices = pickRecoveryPhraseChallengeIndices(24, (max) => {
      counter += 1;
      return (counter * 3) % max;
    });
    expect(indices).toHaveLength(RECOVERY_PHRASE_CHALLENGE_WORD_COUNT[24]);
    expect(new Set(indices).size).toBe(6);
    expect(indices.every((index) => index >= 1 && index <= 24)).toBe(true);
  });

  it("accepts correct answers and rejects incorrect ones without revealing words", () => {
    const phrase = generateRecoveryPhrase(12);
    const words = phrase.split(" ");
    const indices = [2, 7, 11];
    assertRecoveryPhraseChallengeAnswers(
      phrase,
      { 2: words[1], 7: words[6], 11: words[10] },
      indices
    );
    expect(() =>
      assertRecoveryPhraseChallengeAnswers(
        phrase,
        { 2: words[1], 7: "wrong", 11: words[10] },
        indices
      )
    ).toThrow(RECOVERY_PHRASE_CHALLENGE_MISMATCH_MESSAGE);
  });

  it("compares answers case-insensitively", () => {
    const phrase = generateRecoveryPhrase(12);
    const words = phrase.split(" ");
    assertRecoveryPhraseChallengeAnswers(phrase, { 1: words[0]!.toUpperCase() }, [1]);
  });

  it("uses crypto-safe randomness by default", () => {
    const indices = pickRecoveryPhraseChallengeIndices(12);
    expect(indices).toHaveLength(3);
    expect(new Set(indices).size).toBe(3);
  });

  it("rethrows unexpected errors from vault-core confirmation", () => {
    expect(() =>
      assertRecoveryPhraseChallengeAnswers("not-a-valid-phrase", { 1: "word" }, [1])
    ).toThrow();
  });
});
