import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("IndexedDB device storage security", () => {
  const deviceStorage = readFileSync(
    join(process.cwd(), "src/lib/crypto-client/device-storage.ts"),
    "utf-8"
  );

  it("does not persist raw device secret bytes as strings", () => {
    expect(deviceStorage).not.toMatch(/deviceSecret:\s*bytesToBase64Url/);
    expect(deviceStorage).not.toMatch(/deviceSecret:\s*string/);
    expect(deviceStorage).toContain("deviceSecretKey: CryptoKey");
    expect(deviceStorage).not.toContain("bytesToBase64Url");
  });

  it("uses non-extractable device secret keys", () => {
    expect(deviceStorage).toContain("deviceSecretKey");
    expect(deviceStorage).toMatch(/generateKey\([\s\S]*?false[\s\S]*?\["encrypt", "decrypt"\]/);
  });

  it("stores only encrypted vault envelopes, not plaintext vault keys", () => {
    expect(deviceStorage).toContain("encryptedVaultKey");
    expect(deviceStorage).not.toMatch(/vaultKey[^A-Za-z]/);
    expect(deviceStorage).not.toContain("User Vault Key");
  });

  it("bumps IndexedDB version to invalidate legacy exportable secrets", () => {
    expect(deviceStorage).toMatch(/DB_VERSION = 2/);
    expect(deviceStorage).toContain("oldVersion < 2");
  });
});

describe("vault client state cleanup", () => {
  it("clearVaultClientState clears session key and IndexedDB", async () => {
    const vault = readFileSync(join(process.cwd(), "src/lib/crypto-client/vault.ts"), "utf-8");
    expect(vault).toContain("clearVaultClientState");
    expect(vault).toContain("clearLocalVaultData");
    expect(vault).toContain("setSessionVaultKey(null)");
  });
});

describe("CSP headers", () => {
  it("sets restrictive Content-Security-Policy in production", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf-8");
    expect(config).toContain("Content-Security-Policy");
    expect(config).toContain("script-src 'self'");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("frame-ancestors 'none'");
  });
});
