/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LtgVaultUnlockPanel } from "@/features/vault/ltg-vault-unlock-panel";

const requestOptions = vi.fn();

vi.mock("@/lib/passkey/vault-unlock-authenticate", () => ({
  requestVaultUnlockAuthenticationOptions: (...args: unknown[]) => requestOptions(...args),
}));

describe("LtgVaultUnlockPanel", () => {
  beforeEach(() => {
    requestOptions.mockResolvedValue({
      challenge: "abc",
      allowCredentials: [{ id: "cred-1", type: "public-key", transports: ["internal"] }],
    });
  });
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

  it("exposes every unlock method and keeps each control reachable", async () => {
    // A vault that offers all methods: password, recovery phrase, passkey, and a
    // legacy recovery code. Every control must be present and switchable (the
    // mobile risk is a hidden/unreachable control, not layout — RTL ignores CSS).
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
          hasVaultPassword: true,
          hasRecoveryCode: true,
          availableUnlockMethods: { passkey: true, password: true, recoveryPhrase: true },
        }}
        onUnlockPassword={vi.fn()}
        onUnlockRecoveryPhrase={vi.fn()}
        onUnlockPasskey={vi.fn()}
        onUnlockLegacyRecoveryCode={vi.fn()}
        onUnlockLegacyPasskey={vi.fn()}
      />
    );

    // Method tabs are all present.
    expect(screen.getByRole("tab", { name: /vault password/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /recovery phrase/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /recovery code/i })).toBeTruthy();
    // Passkey unlock is offered once options are prefetched.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /unlock with passkey/i })).not.toBeDisabled();
    });

    // Default (password) controls are reachable.
    expect(screen.getByLabelText(/vault password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^unlock vault$/i })).toBeTruthy();

    // Switching to recovery phrase reveals its textarea + submit.
    fireEvent.click(screen.getByRole("tab", { name: /recovery phrase/i }));
    expect(screen.getByLabelText(/recovery phrase/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /recover vault access/i })).toBeTruthy();

    // Switching to recovery code reveals the legacy code input.
    fireEvent.click(screen.getByRole("tab", { name: /recovery code/i }));
    expect(screen.getByLabelText(/recovery code/i)).toBeTruthy();
  });

  it("omits passkey and legacy controls when the vault doesn't offer them", () => {
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
          hasVaultPassword: true,
        }}
        onUnlockPassword={vi.fn()}
        onUnlockRecoveryPhrase={vi.fn()}
      />
    );
    expect(screen.getByRole("tab", { name: /vault password/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /recovery phrase/i })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /recovery code/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /unlock with passkey/i })).toBeNull();
  });
});
