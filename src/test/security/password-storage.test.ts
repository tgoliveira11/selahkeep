import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readModuleSource } from "@/test/helpers/module-source";
import { users } from "@tgoliveira/secure-auth/drizzle/schema";

describe("password storage security", () => {
  it("stores credentials passwords as password_hash bcrypt digests, not plaintext columns", () => {
    const passwordHashColumn = users.passwordHash;
    expect(passwordHashColumn.name).toBe("password_hash");
    expect(String(passwordHashColumn)).not.toMatch(/\bpassword:\s*text\(/);
  });

  it("register route delegates hashing to @tgoliveira/secure-auth", () => {
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

  it("does not expose local user password mutation helpers", () => {
    const repoSource = readModuleSource("src/server/repositories/user-repository.ts");
    expect(repoSource).not.toContain("updatePassword");
    expect(repoSource).not.toContain("create(");
    expect(repoSource).toContain("findById");
  });

  it("account deletion route delegates to the package account handler", () => {
    const accountRoute = readFileSync(
      join(process.cwd(), "src/app/api/account/route.ts"),
      "utf8"
    );
    expect(accountRoute).toContain("secureAuth.routes.account.DELETE");
    expect(accountRoute).not.toContain("bcrypt.compare");
  });
});
