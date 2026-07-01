import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("vault module boundaries", () => {
  it("passkey browser adapter re-exports vault-core PRF helpers", () => {
    const content = readFileSync(
      path.join(process.cwd(), "src/lib/crypto-client/vault-passkey-browser.ts"),
      "utf8"
    );
    expect(content).toContain("@tgoliveira/vault-core/browser");
    expect(content).toContain("SELAHKEEP_PRF_SALT_PREFIX");
  });

  it("password envelope applies SelahKeep session unlock through local controller", () => {
    const content = readFileSync(
      path.join(process.cwd(), "src/modules/vault/core/envelopes/password-envelope.ts"),
      "utf8"
    );
    expect(content).toContain("createPasswordEnvelope");
    expect(content).toContain("SELAHKEEP_VAULT_PROFILE");
    expect(content).toContain("setUnlockedVaultSession");
    expect(content).not.toContain("@tgoliveira/vault-core/browser");
  });

  it("keeps vault session UVK in the vault-core browser adapter module", () => {
    const sessionShim = readFileSync(
      path.join(process.cwd(), "src/lib/crypto-client/vault-session.ts"),
      "utf8"
    );
    const vaultKey = readFileSync(
      path.join(process.cwd(), "src/modules/vault/core/vault-key.ts"),
      "utf8"
    );
    expect(sessionShim).toContain("@tgoliveira/vault-core/browser");
    expect(sessionShim).toContain("coreUnlockVaultSession");
    expect(vaultKey).toContain('@/lib/crypto-client/vault-session');
    expect(vaultKey).not.toContain("let sessionVaultKey");
  });

  it("useVault password unlock applies session through envelope applySession", () => {
    const content = readFileSync(
      path.join(process.cwd(), "src/features/vault/use-vault.ts"),
      "utf8"
    );
    expect(content).toContain("withVaultUnlockRateLimit");
    expect(content).toContain('unlockMethod: "password"');
    expect(content).toContain("hasUnlockedVaultSession()");
    expect(content).not.toContain("explicit: false");
  });
});
