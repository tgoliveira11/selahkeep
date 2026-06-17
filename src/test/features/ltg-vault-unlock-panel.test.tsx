/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LtgVaultUnlockPanel } from "@/features/vault/ltg-vault-unlock-panel";

describe("LtgVaultUnlockPanel", () => {
  it("uses LTG Vault copy", () => {
    render(
      <LtgVaultUnlockPanel
        loading={false}
        error={null}
        vaultStatus={{ initialized: true, recoveryState: "Protected", ltgSetupComplete: true }}
        onUnlockPassword={() => undefined}
        onUnlockRecoveryPhrase={() => undefined}
      />
    );
    expect(screen.getByText(/Unlock LTG Vault/i)).toBeTruthy();
    expect(screen.getByText(/account is signed in/i)).toBeTruthy();
  });

  it("shows purple primary unlock button", () => {
    const { container } = render(
      <LtgVaultUnlockPanel
        loading={false}
        error={null}
        vaultStatus={{
          initialized: true,
          recoveryState: "Protected",
          ltgSetupComplete: true,
          hasVaultPassword: true,
        }}
        onUnlockPassword={() => undefined}
        onUnlockRecoveryPhrase={() => undefined}
      />
    );
    const primary = container.querySelector(".bg-\\[var\\(--primary\\)\\]");
    expect(primary).toBeTruthy();
  });
});
