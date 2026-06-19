import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("passkey account login and vault unlock security boundaries", () => {
  it("does not couple account passkey login to vault unlock", () => {
    expect(() => readSource("src/features/passkey/sign-in-with-passkey.ts")).toThrow();
    expect(() => readSource("src/lib/secure-auth/react-client.ts")).toThrow();
    expect(() =>
      readSource("src/features/passkey/passkey-login-with-vault-unlock.ts")
    ).toThrow();
    expect(() => readSource("src/lib/secure-auth/vault-passkey-react-client.ts")).toThrow();
  });

  it("delegates account passkey verify to the package route", () => {
    const verifyRoute = readSource("src/app/api/auth/passkey/login/verify/route.ts");
    expect(verifyRoute).toContain("secureAuth.routes.passkeyLoginVerify.POST");
    expect(verifyRoute).not.toContain("getVaultUnlockMetadataForCredential");
    expect(verifyRoute).not.toMatch(/decrypt|unwrap|UserVaultKey/i);
  });

  it("removes post-login vault metadata and PRF routes", () => {
    expect(() =>
      readSource("src/app/api/auth/passkey/login/vault-unlock/metadata/route.ts")
    ).toThrow();
    expect(() =>
      readSource("src/app/api/auth/passkey/login/vault-unlock/options/route.ts")
    ).toThrow();
  });

  it("keeps account passkey login options as a pure package delegate", () => {
    const optionsRoute = readSource("src/app/api/auth/passkey/login/options/route.ts");
    expect(optionsRoute).toContain("secureAuth.routes.passkeyLoginOptions.POST");
    expect(optionsRoute).not.toContain("passkeyLoginVaultService");
    expect(optionsRoute).not.toMatch(/unwrap|encryptedVaultKey|prfIncluded/);
  });

  it("keeps explicit signed-in vault unlock in the product flow", () => {
    const unlock = readSource("src/features/passkey/unlock-with-passkey.ts");
    expect(unlock).toContain('"/api/passkeys/authenticate"');
    expect(unlock).toContain("unlockVaultFromPasskeyEnvelope");
    expect(unlock).not.toContain("signIn(");
  });

  it("does not unlock vault from password or OAuth login pages", () => {
    const loginComplete = readSource("src/app/(auth)/login/complete/page.tsx");
    const register = readSource("src/app/(auth)/register/page.tsx");
    expect(loginComplete).not.toContain("unlockVaultFromPasskeyEnvelope");
    expect(register).not.toContain("unlockVaultFromPasskeyEnvelope");
  });
});
