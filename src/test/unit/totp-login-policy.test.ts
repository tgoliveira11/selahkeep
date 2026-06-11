import { describe, it, expect } from "vitest";
import { requiresTotpAfterLogin } from "@/server/policies/totp-login";

describe("TOTP login policy", () => {
  it("does not require TOTP after passkey login", () => {
    expect(requiresTotpAfterLogin("passkey", true)).toBe(false);
    expect(requiresTotpAfterLogin("passkey", false)).toBe(false);
  });

  it("requires TOTP for password login when enabled", () => {
    expect(requiresTotpAfterLogin("credentials", true)).toBe(true);
    expect(requiresTotpAfterLogin("credentials", false)).toBe(false);
  });

  it("follows enabled flag for OAuth login", () => {
    expect(requiresTotpAfterLogin("oauth", true)).toBe(true);
    expect(requiresTotpAfterLogin("oauth", false)).toBe(false);
  });
});
