import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getWebAuthnOrigins,
  getPrimaryWebAuthnOrigin,
  toPasskeyVerificationErrorMessage,
} from "@/lib/passkey/webauthn-config";

describe("webauthn config", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.WEBAUTHN_ORIGIN = "http://localhost:3001";
    process.env.NEXTAUTH_URL = "http://localhost:3001";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("includes localhost and 127.0.0.1 aliases for local dev", () => {
    const origins = getWebAuthnOrigins();
    expect(origins).toContain("http://localhost:3001");
    expect(origins).toContain("http://127.0.0.1:3001");
  });

  it("maps origin mismatch to actionable copy", () => {
    const message = toPasskeyVerificationErrorMessage(
      new Error('Unexpected authentication response origin "http://127.0.0.1:3001"')
    );
    expect(message).toContain(getPrimaryWebAuthnOrigin());
    expect(message).not.toContain("Internal server error");
  });

  it("maps invalid RP ID errors to deployment guidance", () => {
    process.env.APP_BASE_URL = "https://ltg.tgoliveira11.tech";
    process.env.WEBAUTHN_RP_ID = "letter-to-god.vercel.app";
    const message = toPasskeyVerificationErrorMessage(
      new Error('The RP ID "letter-to-god.vercel.app" is invalid for this domain')
    );
    expect(message).toContain("relying party ID");
    expect(message).toContain("letter-to-god.vercel.app");
    expect(message).toContain("APP_BASE_URL");
  });

  it("adds localhost and 127.0.0.1 aliases bidirectionally", () => {
    process.env.WEBAUTHN_ORIGIN = "http://127.0.0.1:3001";
    const origins = getWebAuthnOrigins();
    expect(origins).toContain("http://127.0.0.1:3001");
    expect(origins).toContain("http://localhost:3001");
  });

  it("maps challenge, credential, and unknown failures", () => {
    expect(toPasskeyVerificationErrorMessage(new Error("challenge expired"))).toContain("expired");
    expect(toPasskeyVerificationErrorMessage(new Error("Credential ID not found"))).toContain(
      "passkey"
    );
    expect(toPasskeyVerificationErrorMessage("boom")).toContain("Passkey authentication failed");
  });

  it("uses configured rp id and name", async () => {
    process.env.WEBAUTHN_RP_ID = "example.com";
    process.env.WEBAUTHN_RP_NAME = "Example";
    const { getWebAuthnRpId, getWebAuthnRpName } = await import("@/lib/passkey/webauthn-config");
    expect(getWebAuthnRpId()).toBe("example.com");
    expect(getWebAuthnRpName()).toBe("Example");
  });

  it("ignores invalid configured origins", () => {
    process.env.WEBAUTHN_ORIGIN = "not-a-valid-url";
    expect(getWebAuthnOrigins().length).toBeGreaterThan(0);
  });
});
