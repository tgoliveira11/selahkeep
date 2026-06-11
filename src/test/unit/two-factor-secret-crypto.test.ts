import { describe, it, expect } from "vitest";
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  TwoFactorEncryptionKeyError,
} from "@/server/policies/two-factor-secret-crypto";

describe("two-factor secret crypto", () => {
  it("encrypts and decrypts TOTP secrets", () => {
    const encrypted = encryptTwoFactorSecret("JBSWY3DPEHPK3PXP");
    const plaintext = decryptTwoFactorSecret(encrypted);
    expect(plaintext).toBe("JBSWY3DPEHPK3PXP");
    expect(encrypted.version).toBe("tf-v1");
  });

  it("rejects unsupported payload versions", () => {
    const encrypted = encryptTwoFactorSecret("SECRET");
    expect(() =>
      decryptTwoFactorSecret({ ...encrypted, version: "tf-v0" as "tf-v1" })
    ).toThrow(/Unsupported two-factor secret payload version/);
  });

  it("requires encryption key configuration", () => {
    const previous = process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY;
    delete process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY;
    expect(() => encryptTwoFactorSecret("SECRET")).toThrow(TwoFactorEncryptionKeyError);
    process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY = previous;
  });
});
