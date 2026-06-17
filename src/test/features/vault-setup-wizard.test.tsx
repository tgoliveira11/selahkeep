/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VaultSetupWizard } from "@/features/vault/vault-setup-wizard";

describe("VaultSetupWizard UI", () => {
  it("explains account password vs vault password on intro", () => {
    render(
      <VaultSetupWizard
        step="intro"
        loading={false}
        error={null}
        vaultPassword=""
        vaultPasswordConfirm=""
        recoveryPhrase=""
        phraseConfirmation=""
        onVaultPasswordChange={() => undefined}
        onVaultPasswordConfirmChange={() => undefined}
        onPhraseConfirmationChange={() => undefined}
        onSetStep={() => undefined}
        onGeneratePhrase={() => undefined}
        onComplete={() => undefined}
      />
    );
    expect(screen.getByText(/account signs you in/i)).toBeTruthy();
    expect(screen.getAllByText(/vault password/i).length).toBeGreaterThan(0);
  });

  it("uses purple primary CTA on intro continue", () => {
    const { container } = render(
      <VaultSetupWizard
        step="intro"
        loading={false}
        error={null}
        vaultPassword=""
        vaultPasswordConfirm=""
        recoveryPhrase=""
        phraseConfirmation=""
        onVaultPasswordChange={() => undefined}
        onVaultPasswordConfirmChange={() => undefined}
        onPhraseConfirmationChange={() => undefined}
        onSetStep={() => undefined}
        onGeneratePhrase={() => undefined}
        onComplete={() => undefined}
      />
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("var(--primary)");
  });

  it("lets user choose 12 or 24 recovery words", () => {
    const onGenerate = vi.fn();
    render(
      <VaultSetupWizard
        step="phrase-length"
        loading={false}
        error={null}
        vaultPassword=""
        vaultPasswordConfirm=""
        recoveryPhrase=""
        phraseConfirmation=""
        onVaultPasswordChange={() => undefined}
        onVaultPasswordConfirmChange={() => undefined}
        onPhraseConfirmationChange={() => undefined}
        onSetStep={() => undefined}
        onGeneratePhrase={onGenerate}
        onComplete={() => undefined}
      />
    );
    fireEvent.click(screen.getByText("12 words"));
    expect(onGenerate).toHaveBeenCalledWith(12);
    fireEvent.click(screen.getByText("24 words"));
    expect(onGenerate).toHaveBeenCalledWith(24);
  });
});
