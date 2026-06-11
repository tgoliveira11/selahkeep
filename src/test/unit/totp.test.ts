import { describe, it, expect } from "vitest";
import { generate } from "otplib";
import {
  buildOtpAuthUri,
  generateTotpSecret,
  verifyTotpCode,
} from "@/server/policies/totp";

describe("totp policy", () => {
  it("generates secrets and otpauth URIs", () => {
    const secret = generateTotpSecret();
    const uri = buildOtpAuthUri("user@example.com", secret);
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("Letters%20to%20God");
  });

  it("verifies valid and invalid codes", async () => {
    const secret = generateTotpSecret();
    const token = await generate({ secret });
    await expect(verifyTotpCode(secret, token)).resolves.toBe(true);
    await expect(verifyTotpCode(secret, "000000")).resolves.toBe(false);
    await expect(verifyTotpCode(secret, "abc")).resolves.toBe(false);
  });
});
