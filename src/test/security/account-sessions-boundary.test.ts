import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SENTINEL = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

function readPackageSource() {
  return readFileSync(
    join(process.cwd(), "node_modules/@tgoliveira/secure-auth/dist/next/index.js"),
    "utf8"
  );
}

describe("account sessions security boundaries", () => {
  it("does not expose raw session tokens in package session handlers", () => {
    const source = readPackageSource();
    expect(source).not.toMatch(/sessionToken/i);
    expect(source).toContain("maskIp");
  });

  it("does not include private letter fields in package session code", () => {
    const source = readPackageSource();
    expect(source).not.toContain(SENTINEL);
    expect(source).not.toMatch(/vaultKey|encryptedTitle|encryptedBody/i);
  });

  it("does not revoke trusted devices from package session management", () => {
    const source = readPackageSource();
    expect(source).not.toMatch(/trustedDevice|vaultEnvelope|trusted_devices/i);
  });
});
