import { describe, expect, it } from "vitest";
import {
  passkeyPrfExtensions,
  passkeyPrfSaltBase64Url,
  passkeyPrfSaltBytes,
} from "@/lib/passkey/prf";
import { base64UrlToBytes } from "@/lib/crypto-client/encoding";

describe("passkey PRF salt", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  it("derives a stable 32-byte salt per user", () => {
    const a = passkeyPrfSaltBytes(userId);
    const b = passkeyPrfSaltBytes(userId);
    expect(a).toHaveLength(32);
    expect(a).toEqual(b);
  });

  it("encodes salt as base64url for WebAuthn extensions", () => {
    const bytes = passkeyPrfSaltBytes(userId);
    const encoded = passkeyPrfSaltBase64Url(userId);
    expect(base64UrlToBytes(encoded)).toEqual(bytes);
  });

  it("builds WebAuthn PRF extension payload", () => {
    const extensions = passkeyPrfExtensions(userId);
    expect(extensions).toHaveProperty("prf");
  });
});
