import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("passkey login vault unlock security boundaries", () => {
  it("does not keep a local account passkey sign-in client", () => {
    expect(() => readSource("src/features/passkey/sign-in-with-passkey.ts")).toThrow();
  });

  it("delegates account passkey verify to the package route", () => {
    const verifyRoute = readSource("src/app/api/auth/passkey/login/verify/route.ts");
    expect(verifyRoute).toContain("secureAuth.routes.passkeyLoginVerify.POST");
    expect(verifyRoute).not.toContain("getVaultUnlockMetadataForCredential");
    expect(verifyRoute).not.toMatch(/decrypt|unwrap|UserVaultKey/i);
  });

  it("keeps vault PRF enrichment on login options only in the product vault service", () => {
    const optionsRoute = readSource("src/app/api/auth/passkey/login/options/route.ts");
    expect(optionsRoute).toContain("passkeyLoginVaultService.enrichLoginOptionsWithVaultPrf");
    expect(optionsRoute).toContain("secureAuth.routes.passkeyLoginOptions.POST");
  });

  it("does not unlock vault from password or OAuth login pages", () => {
    const loginComplete = readSource("src/app/(auth)/login/complete/page.tsx");
    const register = readSource("src/app/(auth)/register/page.tsx");
    expect(loginComplete).not.toContain("unlockVaultFromPasskeyEnvelope");
    expect(register).not.toContain("unlockVaultFromPasskeyEnvelope");
  });
});
