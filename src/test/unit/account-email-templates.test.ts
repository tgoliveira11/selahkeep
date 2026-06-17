import { describe, it, expect } from "vitest";
import {
  passwordResetEmailContent,
  verificationEmailContent,
} from "@/server/email/account-email-templates";

const SENTINEL = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

describe("account email templates", () => {
  it("never includes private letter content", () => {
    const verification = verificationEmailContent("opaque-token");
    const reset = passwordResetEmailContent("opaque-token");
    for (const content of [verification.text, verification.html, reset.text, reset.html]) {
      expect(content).not.toContain(SENTINEL);
      expect(content).not.toMatch(/encryptedTitle|encryptedBody|vaultKey/i);
    }
  });

  it("builds verification and reset templates without raw secrets in subject", () => {
    const verification = verificationEmailContent("opaque-token");
    const reset = passwordResetEmailContent("opaque-token");
    expect(verification.subject).toContain("Verify");
    expect(reset.subject).toContain("Reset");
    expect(verification.text).toContain("/verify-email?token=");
    expect(reset.text).toContain("/reset-password?token=");
    expect(verification.text).not.toContain("private letter");
    expect(reset.text).toMatch(/does not unlock your vault/i);
  });
});
