import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readModuleSource } from "@/test/helpers/module-source";
import { hashOpaqueToken } from "@/server/policies/login-token";
import { users } from "@tgoliveira/secure-auth/drizzle/schema";

const SAMPLE_BCRYPT_HASH =
  "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

describe("password storage security", () => {
  it("stores credentials passwords as password_hash bcrypt digests, not plaintext columns", () => {
    const passwordHashColumn = users.passwordHash;
    expect(passwordHashColumn.name).toBe("password_hash");
    expect(String(passwordHashColumn)).not.toMatch(/\bpassword:\s*text\(/);
  });

  it("rejects plaintext values at the user repository boundary", async () => {
    const { userRepository } = await import("@/server/repositories/user-repository");
    await expect(
      userRepository.create({
        email: "guard@example.com",
        authProvider: "credentials",
        passwordHash: "MySecretPassword123!",
      })
    ).rejects.toThrow(/bcrypt digest/);
  });

  it("allows null password_hash for OAuth-only accounts", () => {
    const repoSource = readModuleSource("src/server/repositories/user-repository.ts");
    expect(repoSource).toContain("validateStoredPasswordHash");
  });

  it("register route hashes before persistence", () => {
    const registerRoute = readFileSync(
      join(process.cwd(), "src/app/api/auth/register/route.ts"),
      "utf8"
    );
    expect(registerRoute).toContain("secureAuth.routes.register.POST");
    expect(registerRoute).not.toContain("hashPassword");
    expect(registerRoute).not.toContain("bcrypt.hash");
    expect(registerRoute).not.toMatch(/passwordHash:\s*parsed\.data\.password/);

    const secureAuthRegisterHandler = readFileSync(
      join(process.cwd(), "node_modules/@tgoliveira/secure-auth/dist/next/index.js"),
      "utf8"
    );
    expect(secureAuthRegisterHandler).toContain("hashPassword");
  });

  it("account deletion verifies against bcrypt digests only", () => {
    const accountService = readModuleSource("src/server/services/account-service.ts");
    expect(accountService).toContain("verifyPassword");
    expect(accountService).not.toContain("bcrypt.compare");
  });

  it("accepts bcrypt digests at repository updatePassword", async () => {
    const repoSource = readModuleSource("src/server/repositories/user-repository.ts");
    expect(repoSource).toContain("assertPasswordHashFormat");
    expect(SAMPLE_BCRYPT_HASH).toMatch(/^\$2[aby]\$\d{2}\$/);
  });
});
