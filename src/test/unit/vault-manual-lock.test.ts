import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("manual vault lock", () => {
  it("useRequireVault does not silently unlock from device envelopes", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/features/vault/use-require-vault.ts"),
      "utf-8"
    );
    expect(hook).not.toContain("unwrapVaultKeyFromDevice");
    expect(hook).toContain("hasUnlockedVaultSession()");
    expect(hook).toContain("Account session alone never unlocks the vault");
  });

  it("vault-session manual lock blocks until explicit unlock", async () => {
    const { lockVaultSession, isVaultManuallyLocked } = await import(
      "@/lib/crypto-client/vault-session"
    );
    lockVaultSession();
    expect(isVaultManuallyLocked()).toBe(true);
  });
});
