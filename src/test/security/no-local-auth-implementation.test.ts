import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

const forbiddenPaths = [
  "src/modules/auth",
  "src/modules/account",
  "src/modules/sessions",
  "src/modules/two-factor",
  "src/features/passkey/sign-in-with-passkey.ts",
  "src/lib/secure-auth/react-client.ts",
  "src/lib/secure-auth/react-client-reexports.ts",
  "src/server/services/account-service.ts",
  "src/server/services/passkey-account-service.ts",
  "src/server/services/passkey-login-service.ts",
  "src/components/auth",
  "src/components/settings",
];

const delegatedAuthRoutes = [
  "src/app/api/auth/register/route.ts",
  "src/app/api/auth/forgot-password/route.ts",
  "src/app/api/auth/reset-password/route.ts",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/api/account/route.ts",
  "src/app/api/account/change-password/route.ts",
  "src/app/api/account/sessions/route.ts",
  "src/app/api/account/2fa/status/route.ts",
  "src/app/api/account/passkeys/route.ts",
  "src/app/api/auth/passkey/login/verify/route.ts",
];

describe("no local auth implementation guard", () => {
  it("does not keep competing local auth module trees or shims", () => {
    for (const relativePath of forbiddenPaths) {
      expect(existsSync(path.join(root, relativePath))).toBe(false);
    }
  });

  it("delegates account auth API routes to @tgoliveira/secure-auth", () => {
    for (const relativePath of delegatedAuthRoutes) {
      const source = readSource(relativePath);
      expect(source).toContain("secureAuth.routes");
      expect(source).not.toMatch(/bcrypt\.(hash|compare)/);
      expect(source).not.toContain("userRepository.create");
    }
  });

  it("keeps a single createSecureAuth composition root", () => {
    const source = readSource("src/lib/secure-auth.ts");
    expect(source).toContain("createSecureAuth");
    expect(source).not.toContain("createAuthServices");
    expect(source).not.toContain("@tgoliveira/secure-auth/server");
  });

  it("does not import removed local auth modules from product code", () => {
    const productPaths = [
      "src/app/api/letters/route.ts",
      "src/app/api/vault/status/route.ts",
      "src/server/services/vault-service.ts",
    ];
    for (const relativePath of productPaths) {
      const source = readSource(relativePath);
      expect(source).not.toMatch(/@\/modules\/(auth|account|sessions|two-factor)/);
    }
  });
});
