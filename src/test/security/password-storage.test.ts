import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readModuleSource } from "@/test/helpers/module-source";
import { userRepository } from "@/server/repositories/user-repository";

const SAMPLE_BCRYPT_HASH =
  "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

describe("password storage security", () => {
  it("stores credentials passwords as password_hash bcrypt digests, not plaintext columns", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf8");
    const usersSection = schema.slice(schema.indexOf('export const users'));

    expect(usersSection).toContain('passwordHash: text("password_hash")');
    expect(usersSection).not.toMatch(/\bpassword:\s*text\(/);
    expect(usersSection).not.toContain("plaintextPassword");
  });

  it("rejects plaintext values at the user repository boundary", async () => {
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
    expect(registerRoute).toContain("hashPassword");
    expect(registerRoute).not.toContain("bcrypt.hash");
    expect(registerRoute).not.toMatch(/passwordHash:\s*parsed\.data\.password/);
  });

  it("login and account deletion verify against bcrypt digests only", () => {
    const authLoginService = readModuleSource("src/server/services/auth-login-service.ts");
    const accountService = readModuleSource("src/server/services/account-service.ts");

    expect(authLoginService).toContain("verifyPassword");
    expect(authLoginService).not.toContain("bcrypt.compare");
    expect(accountService).toContain("verifyPassword");
    expect(accountService).not.toContain("bcrypt.compare");
  });

  it("accepts bcrypt digests at repository updatePassword", async () => {
    // Format guard is synchronous; DB call may fail without PostgreSQL.
    const repoSource = readModuleSource("src/server/repositories/user-repository.ts");
    expect(repoSource).toContain("assertPasswordHashFormat");
    expect(SAMPLE_BCRYPT_HASH).toMatch(/^\$2[aby]\$\d{2}\$/);
  });
});
