import { describe, it, expect } from "vitest";
import { generateRecoveryCode } from "@/lib/crypto-client/recovery-code";
import { readFileSync } from "fs";
import { join } from "path";

describe("recovery code security", () => {
  it("generates codes with sufficient word count", () => {
    const code = generateRecoveryCode();
    const words = code.split("-");
    expect(words.length).toBeGreaterThanOrEqual(12);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateRecoveryCode()));
    expect(codes.size).toBe(10);
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
