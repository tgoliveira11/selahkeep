import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("vault passkey react client shim", () => {
  it("replaces signInWithPasskey with vault-only product flow", () => {
    const shim = readSource("src/lib/secure-auth/vault-passkey-react-client.ts");
    expect(shim).toContain("passkey-login-with-vault-unlock");
    expect(shim).toContain("vault-passkey-react-reexports");
    expect(shim).not.toContain("secureAuth.routes");
  });

  it("aliases package react client in next and vitest config", () => {
    const nextConfig = readSource("next.config.ts");
    const vitestConfig = readSource("vitest.config.ts");
    expect(nextConfig).toContain("vault-passkey-react-client");
    expect(vitestConfig).toContain("vault-passkey-react-client");
  });
});
