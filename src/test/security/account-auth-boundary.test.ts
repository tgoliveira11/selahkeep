import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readModuleSource } from "@/test/helpers/module-source";
import { hashOpaqueToken } from "@/server/policies/login-token";

const SENTINEL = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

describe("account auth security boundaries", () => {
  it("does not store plaintext tokens in account auth service", () => {
    const source = readModuleSource("src/server/services/account-auth-service.ts");
    expect(source).toContain("hashOpaqueToken");
    expect(source).not.toMatch(/tokenHash:\s*token[^H]/);
  });

  it("hashes opaque tokens before persistence", () => {
    const hash = hashOpaqueToken("example-token-value");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("example-token-value");
  });

  it("does not send private letter content in email templates", () => {
    const source = readModuleSource("src/server/email/account-email-templates.ts");
    expect(source).not.toContain(SENTINEL);
    expect(source).not.toMatch(/encryptedTitle|encryptedBody|vaultKey/i);
  });

  it("does not log raw tokens in email adapters", () => {
    for (const file of ["send-email.ts", "smtp-provider.ts"]) {
      const source = readModuleSource(`src/server/email/${file}`);
      expect(source).not.toMatch(/logger\.(info|error|warn)\([^)]*token/i);
      expect(source).not.toMatch(/safeLogger\.(info|error|warn)\([^)]*input\.(text|html)/i);
    }
  });
});
