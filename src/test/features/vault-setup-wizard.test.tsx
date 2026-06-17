/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VaultSetupWizard } from "@/features/vault/vault-setup-wizard";
import { buildVaultPasswordPolicyFromEnv } from "@/lib/config/vault-password-policy";

const defaultPolicy = buildVaultPasswordPolicyFromEnv({
  VAULT_PASSWORD_MIN_LENGTH: "16",
  VAULT_PASSWORD_ENFORCEMENT: "enforce",
});

const baseProps = {
  loading: false,
  error: null,
  vaultPasswordPolicy: defaultPolicy,
  vaultPassword: "",
  vaultPasswordConfirm: "",
  recoveryPhrase: "",
  phraseConfirmation: "",
  onVaultPasswordChange: vi.fn(),
  onVaultPasswordConfirmChange: vi.fn(),
  onPhraseConfirmationChange: vi.fn(),
  onSetStep: vi.fn(),
  onGeneratePhrase: vi.fn(),
  onComplete: vi.fn(),
};

describe("VaultSetupWizard UI", () => {
  it("explains account password vs vault password on intro", () => {
    render(<VaultSetupWizard {...baseProps} step="intro" />);
    expect(screen.getByText(/account signs you in/i)).toBeTruthy();
    expect(screen.getAllByText(/vault password/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/letters/i)).toBeNull();
  });

  it("uses purple primary CTA on intro continue", () => {
    const { container } = render(<VaultSetupWizard {...baseProps} step="intro" />);
    const button = container.querySelector("button");
    expect(button?.className).toContain("var(--primary)");
  });

  it("renders secure-auth password setup fields on password step", () => {
    render(<VaultSetupWizard {...baseProps} step="password" />);
    expect(screen.getByLabelText(/^Vault password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Confirm vault password$/i)).toBeTruthy();
    expect(screen.getByText(/account password signs you in/i)).toBeTruthy();
  });

  it("shows password requirements feedback", () => {
    render(<VaultSetupWizard {...baseProps} step="password" />);
    fireEvent.change(screen.getByLabelText(/^Vault password$/i), {
      target: { value: "short" },
    });
    expect(screen.getByText(/at least 16 characters/i)).toBeTruthy();
  });

  it("disables continue when password is below VAULT_PASSWORD_MIN_LENGTH", () => {
    render(<VaultSetupWizard {...baseProps} step="password" />);
    fireEvent.change(screen.getByLabelText(/^Vault password$/i), {
      target: { value: "too-short-password" },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm vault password$/i), {
      target: { value: "too-short-password" },
    });
    expect(screen.getByRole("button", { name: /^Continue$/i })).toHaveProperty("disabled", true);
  });

  it("disables continue when confirmation does not match", () => {
    render(<VaultSetupWizard {...baseProps} step="password" />);
    fireEvent.change(screen.getByLabelText(/^Vault password$/i), {
      target: { value: "valid-vault-password-phrase" },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm vault password$/i), {
      target: { value: "different-vault-password" },
    });
    expect(screen.getByRole("button", { name: /^Continue$/i })).toHaveProperty("disabled", true);
  });

  it("enables continue when password satisfies vault policy and confirmation matches", () => {
    const onSetStep = vi.fn();

    function ControlledPasswordStep() {
      const [vaultPassword, setVaultPassword] = useState("");
      const [vaultPasswordConfirm, setVaultPasswordConfirm] = useState("");
      return (
        <VaultSetupWizard
          {...baseProps}
          step="password"
          vaultPassword={vaultPassword}
          vaultPasswordConfirm={vaultPasswordConfirm}
          onVaultPasswordChange={setVaultPassword}
          onVaultPasswordConfirmChange={setVaultPasswordConfirm}
          onSetStep={onSetStep}
        />
      );
    }

    render(<ControlledPasswordStep />);
    const password = "valid-vault-password-phrase";
    fireEvent.change(screen.getByLabelText(/^Vault password$/i), {
      target: { value: password },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm vault password$/i), {
      target: { value: password },
    });
    const continueButton = screen.getByRole("button", { name: /^Continue$/i });
    expect(continueButton).toHaveProperty("disabled", false);
    fireEvent.click(continueButton);
    expect(onSetStep).toHaveBeenCalledWith("phrase-length");
  });

  it("lets user choose 12 or 24 recovery words", () => {
    const onGenerate = vi.fn();
    render(<VaultSetupWizard {...baseProps} step="phrase-length" onGeneratePhrase={onGenerate} />);
    fireEvent.click(screen.getByText("12 words"));
    expect(onGenerate).toHaveBeenCalledWith(12);
    fireEvent.click(screen.getByText("24 words"));
    expect(onGenerate).toHaveBeenCalledWith(24);
  });
});

describe("VaultSetupWizard password policy wiring", () => {
  it("uses explicit vault policy min length in validation feedback", () => {
    const strictPolicy = buildVaultPasswordPolicyFromEnv({ VAULT_PASSWORD_MIN_LENGTH: "20" });
    render(
      <VaultSetupWizard {...baseProps} step="password" vaultPasswordPolicy={strictPolicy} />
    );
    fireEvent.change(screen.getByLabelText(/^Vault password$/i), {
      target: { value: "sixteen-characters" },
    });
    expect(screen.getByText(/at least 20 characters/i)).toBeTruthy();
  });
});
