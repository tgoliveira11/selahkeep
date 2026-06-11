import { describe, it, expect } from "vitest";
import { requiresTotpAfterLogin } from "@/server/policies/totp-login";
import { getPasskeyCapabilityLabel } from "@/lib/passkey/credential-label";

describe("passkey login security boundaries", () => {
  it("does not require TOTP after passkey login when 2FA is enabled", () => {
    expect(requiresTotpAfterLogin("passkey", true)).toBe(false);
  });

  it("still requires TOTP for password login when 2FA is enabled", () => {
    expect(requiresTotpAfterLogin("credentials", true)).toBe(true);
  });

  it("treats sign-in-only passkeys separately from vault recovery", () => {
    expect(
      getPasskeyCapabilityLabel({ signInEnabled: true, vaultUnlockEnabled: false })
    ).toBe("sign-in-only");
  });
});
