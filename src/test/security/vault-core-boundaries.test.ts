import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("vault module boundaries", () => {
  it("vault crypto client re-exports vault-core browser passkey helpers", () => {
    const content = readFileSync(
      path.join(process.cwd(), "src/modules/vault/client/passkey-prf.ts"),
      "utf8"
    );
    expect(content).toContain("@tgoliveira/vault-core/browser");
    expect(content).toContain("SELAHKEEP_PRF_SALT_PREFIX");
  });

  it("password envelope uses SelahKeep profile with vault-core", () => {
    const content = readFileSync(
      path.join(process.cwd(), "src/modules/vault/core/envelopes/password-envelope.ts"),
      "utf8"
    );
    expect(content).toContain("createPasswordEnvelope");
    expect(content).toContain("SELAHKEEP_VAULT_PROFILE");
    expect(content).toContain("unlockVaultSession");
  });

  it("vault session extends vault-core memory session with SelahKeep auto-lock hooks", () => {
    const content = readFileSync(
      path.join(process.cwd(), "src/modules/vault/client/vault-session.ts"),
      "utf8"
    );
    expect(content).toContain("@tgoliveira/vault-core/browser");
    expect(content).toContain("registerVaultBeforeAutoLock");
    expect(content).toContain("clearNoteBodyCache");
  });

  it("useVault unlocks session explicitly after passkey unwrap", () => {
    const content = readFileSync(
      path.join(process.cwd(), "src/features/vault/use-vault.ts"),
      "utf8"
    );
    expect(content).toContain("unlockVaultSession(key)");
    expect(content).not.toContain("touchVaultSession()");
  });
});
