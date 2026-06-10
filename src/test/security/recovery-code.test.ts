import { describe, it, expect } from "vitest";
import {
  generateRecoveryCode,
  getRecoveryCodeEntropyBits,
  getRecoveryWordlistSize,
  RECOVERY_CODE_MIN_ENTROPY_BITS,
  RECOVERY_WORDS_PER_CODE,
} from "@/lib/crypto-client/recovery-code";
import { readFileSync } from "fs";
import { join } from "path";

describe("recovery code security", () => {
  it("meets minimum 128-bit entropy mathematically", () => {
    const wordlistSize = getRecoveryWordlistSize();
    const entropyBits = getRecoveryCodeEntropyBits();
    expect(wordlistSize).toBeGreaterThan(1);
    expect(RECOVERY_WORDS_PER_CODE).toBeGreaterThanOrEqual(
      Math.ceil(RECOVERY_CODE_MIN_ENTROPY_BITS / Math.log2(wordlistSize))
    );
    expect(entropyBits).toBeGreaterThanOrEqual(RECOVERY_CODE_MIN_ENTROPY_BITS);
    expect(wordlistSize).toBe(252);
    expect(RECOVERY_WORDS_PER_CODE).toBe(17);
    expect(entropyBits).toBeCloseTo(135.6, 1);
  });

  it("generates codes with the configured word count", () => {
    const code = generateRecoveryCode();
    const words = code.split("-");
    expect(words.length).toBe(RECOVERY_WORDS_PER_CODE);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRecoveryCode()));
    expect(codes.size).toBe(20);
  });

  it("vault repository stores kdf metadata not plaintext recovery code", () => {
    const vaultRepo = readFileSync(
      join(process.cwd(), "src/server/repositories/vault-repository.ts"),
      "utf-8"
    );
    expect(vaultRepo).toContain("kdfMetadata");
    expect(vaultRepo).not.toContain("recoveryCode");
    expect(vaultRepo).not.toContain("recovery_code_plaintext");
  });
});
