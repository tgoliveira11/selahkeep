import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readModuleSource } from "@/test/helpers/module-source";
import { hashOpaqueToken } from "@/server/policies/login-token";

const SENTINEL = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

describe("account auth security boundaries", () => {
  it("does not store plaintext tokens in secure-auth package handlers", () => {
    const source = readFileSync(
      join(process.cwd(), "node_modules/@tgoliveira/secure-auth/dist/next/index.js"),
      "utf8"
    );
    expect(source).toContain("hashOpaqueToken");
    expect(source).not.toMatch(/tokenHash:\s*token[^H]/);
  });

  it("hashes opaque tokens before persistence", () => {
    const hash = hashOpaqueToken("example-token-value");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("example-token-value");
  });

  it("does not send private letter content in app email templates", () => {
    const source = readModuleSource("src/lib/secure-auth.ts");
    expect(source).not.toContain(SENTINEL);
    expect(source).not.toMatch(/encryptedTitle|encryptedBody|vaultKey/i);
  });

  it("does not log raw tokens in email adapters", () => {
    for (const file of ["send-email.ts", "smtp-provider.ts"]) {
      const source = readModuleSource(`src/modules/email/core/${file}`);
      expect(source).not.toMatch(/logger\.(info|error|warn)\([^)]*token/i);
      expect(source).not.toMatch(/safeLogger\.(info|error|warn)\([^)]*input\.(text|html)/i);
    }
  });
});
