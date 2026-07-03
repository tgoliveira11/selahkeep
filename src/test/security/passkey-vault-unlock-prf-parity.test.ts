import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("passkey vault unlock PRF ceremony parity", () => {
  it("setup, unlock, and test share prepareVaultUnlockAuthenticationOptions", () => {
    const setup = readSource("src/features/passkey/passkey-vault-unlock-setup.tsx");
    const unlock = readSource("src/lib/passkey/vault-unlock-authenticate.ts");
    expect(setup).toContain("runVaultUnlockAuthenticationCeremony");
    expect(unlock).toContain("prepareVaultUnlockAuthenticationOptions");
    expect(unlock).toContain("alignPrfExtensionsForAllowCredentials");
  });

  it("aligns evalByCredential to eval when a single credential remains", () => {
    const source = readSource("src/lib/passkey/prepare-webauthn-options.ts");
    expect(source).toContain("alignPrfExtensionsForAllowCredentials");
    expect(source).toContain("forceCredentialId");
    expect(source).toContain('prf: { eval: evalInput }');
  });

  it("prefers per-credential PRF output before results.first", () => {
    const source = readSource("src/lib/passkey/normalize-prf-output.ts");
    const credentialBlock = source.indexOf("if (credentialId && record[credentialId]");
    const firstBlock = source.indexOf("if (record.first != null)");
    expect(credentialBlock).toBeGreaterThan(-1);
    expect(firstBlock).toBeGreaterThan(credentialBlock);
  });

  it("forces internal transport on Apple mobile for all vault unlock credentials", () => {
    const source = readSource("src/lib/passkey/passkey-transports.ts");
    expect(source).toMatch(/transports: \["internal"\]/);
  });
});
