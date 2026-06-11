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
});
