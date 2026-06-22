/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LtgVaultUnlockPanel } from "@/features/vault/ltg-vault-unlock-panel";

describe("LtgVaultUnlockPanel", () => {
  it("uses SelahKeep copy", () => {
    render(
      <LtgVaultUnlockPanel
        loading={false}
        error={null}
        vaultStatus={{
          initialized: true,
          hasVault: true,
          setupPhase: "complete",
          setupComplete: true,
          recoveryState: "Protected",
          ltgSetupComplete: true,
        }}
        onUnlockPassword={() => undefined}
        onUnlockRecoveryPhrase={() => undefined}
      />
    );
    expect(screen.getByText(/Unlock SelahKeep/i)).toBeTruthy();
    expect(screen.getByText(/account is signed in/i)).toBeTruthy();
  });

  it("shows purple primary unlock button", () => {
    const { container } = render(
      <LtgVaultUnlockPanel
        loading={false}
        error={null}
        vaultStatus={{
          initialized: true,
          hasVault: true,
          setupPhase: "complete",
          setupComplete: true,
          recoveryState: "Protected",
          ltgSetupComplete: true,
          hasVaultPassword: true,
        }}
        onUnlockPassword={() => undefined}
        onUnlockRecoveryPhrase={() => undefined}
      />
    );
    const primary = container.querySelector(".bg-\\[var\\(--primary-solid\\)\\]");
    expect(primary).toBeTruthy();
  });
});
