import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("passkey login vault unlock security boundaries", () => {
  it("unlocks vault before session only in the passkey feature module", () => {
    const source = readSource("src/features/passkey/sign-in-with-passkey.ts");
    const unlockIndex = source.indexOf("unlockVaultFromPasskeyEnvelope");
    const signInIndex = source.indexOf('signIn("login-token"');
    expect(unlockIndex).toBeGreaterThan(-1);
    expect(signInIndex).toBeGreaterThan(-1);
    expect(unlockIndex).toBeLessThan(signInIndex);
  });

  it("does not unlock vault from password or OAuth login paths", () => {
    const loginComplete = readSource("src/app/(auth)/login/complete/page.tsx");
    const register = readSource("src/app/(auth)/register/page.tsx");
    expect(loginComplete).not.toContain("unlockVaultFromPasskeyEnvelope");
    expect(register).not.toContain("unlockVaultFromPasskeyEnvelope");
  });

  it("enriches verify responses with envelope metadata without decrypting server-side", () => {
    const verifyRoute = readSource("src/app/api/auth/passkey/login/verify/route.ts");
    expect(verifyRoute).toContain("getVaultUnlockMetadataForCredential");
    expect(verifyRoute).not.toMatch(/decrypt|unwrap|UserVaultKey/i);
  });

  it("uses a react client shim instead of patching package internals", () => {
    const shim = readSource("src/lib/secure-auth/react-client.ts");
    expect(shim).toContain("./react-client-reexports");
    expect(shim).toContain("@/features/passkey/sign-in-with-passkey");
    expect(shim).not.toContain("node_modules/@tgoliveira/secure-auth");
  });
});
