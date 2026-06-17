"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { VaultSetupStep } from "./use-ltg-vault-setup";
import type { RecoveryPhraseLength } from "@/lib/crypto-client/recovery-phrase";

interface VaultSetupWizardProps {
  step: VaultSetupStep;
  loading: boolean;
  error: string | null;
  vaultPassword: string;
  vaultPasswordConfirm: string;
  recoveryPhrase: string;
  phraseConfirmation: string;
  onVaultPasswordChange: (value: string) => void;
  onVaultPasswordConfirmChange: (value: string) => void;
  onPhraseConfirmationChange: (value: string) => void;
  onSetStep: (step: VaultSetupStep) => void;
  onGeneratePhrase: (length: RecoveryPhraseLength) => void;
  onComplete: () => void;
}

export function VaultSetupWizard({
  step,
  loading,
  error,
  vaultPassword,
  vaultPasswordConfirm,
  recoveryPhrase,
  phraseConfirmation,
  onVaultPasswordChange,
  onVaultPasswordConfirmChange,
  onPhraseConfirmationChange,
  onSetStep,
  onGeneratePhrase,
  onComplete,
}: VaultSetupWizardProps) {
  const passwordsMatch = vaultPassword === vaultPasswordConfirm;
  const passwordLongEnough = vaultPassword.length >= 12;

  return (
    <Card className="space-y-5 p-6">
      {step === "intro" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Set up LTG Vault</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Your account signs you in. Your <strong>vault password</strong> opens your private
              notes. Your <strong>recovery phrase</strong> restores access if you forget the vault
              password — it does not recover your account password.
            </p>
          </div>
          <Alert variant="info" title="Your privacy">
            Your vault password and recovery phrase never leave this device. We cannot read or reset
            them for you.
          </Alert>
          <Button className="w-full" onClick={() => onSetStep("password")}>
            Continue
          </Button>
        </>
      )}

      {step === "password" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Create your vault password</h2>
            <p className="text-sm text-[var(--muted)]">
              Choose a passphrase you will use to unlock your vault. This is separate from your
              account password.
            </p>
          </div>
          <FormField label="Vault password" id="vault-password">
            <Input
              id="vault-password"
              type="password"
              autoComplete="new-password"
              value={vaultPassword}
              onChange={(e) => onVaultPasswordChange(e.target.value)}
            />
          </FormField>
          <FormField label="Confirm vault password" id="vault-password-confirm">
            <Input
              id="vault-password-confirm"
              type="password"
              autoComplete="new-password"
              value={vaultPasswordConfirm}
              onChange={(e) => onVaultPasswordConfirmChange(e.target.value)}
            />
          </FormField>
          {!passwordLongEnough && vaultPassword.length > 0 && (
            <p className="text-sm text-[var(--warning)]">Use at least 12 characters.</p>
          )}
          {vaultPasswordConfirm.length > 0 && !passwordsMatch && (
            <p className="text-sm text-[var(--danger)]">Passwords do not match.</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => onSetStep("intro")}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!passwordsMatch || !passwordLongEnough}
              onClick={() => onSetStep("phrase-length")}
            >
              Continue
            </Button>
          </div>
        </>
      )}

      {step === "phrase-length" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Choose recovery phrase length</h2>
            <p className="text-sm text-[var(--muted)]">
              A longer phrase is stronger. You will need this phrase to recover access to your vault
              if you forget your vault password.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => onGeneratePhrase(12)}>
              12 words
              <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                Standard security
              </span>
            </Button>
            <Button onClick={() => onGeneratePhrase(24)}>
              24 words
              <span className="mt-1 block text-xs font-normal text-[var(--accent-muted)]">
                Stronger security
              </span>
            </Button>
          </div>
          <Button variant="secondary" onClick={() => onSetStep("password")}>
            Back
          </Button>
        </>
      )}

      {step === "phrase-display" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Save your recovery phrase</h2>
            <p className="text-sm text-[var(--muted)]">
              Write these words down and store them somewhere safe. This is the only time we will
              show them.
            </p>
          </div>
          <div
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-4 font-mono text-sm leading-relaxed"
            data-testid="recovery-phrase-display"
          >
            {recoveryPhrase}
          </div>
          <Button className="w-full" onClick={() => onSetStep("phrase-confirm")}>
            I have saved my phrase
          </Button>
        </>
      )}

      {step === "phrase-confirm" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Confirm your recovery phrase</h2>
            <p className="text-sm text-[var(--muted)]">
              Enter the phrase exactly to confirm you saved it.
            </p>
          </div>
          <FormField label="Recovery phrase" id="phrase-confirm">
            <Textarea
              id="phrase-confirm"
              rows={4}
              value={phraseConfirmation}
              onChange={(e) => onPhraseConfirmationChange(e.target.value)}
              placeholder="Enter your recovery phrase"
            />
          </FormField>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => onSetStep("phrase-display")}>
              Back
            </Button>
            <Button className="flex-1" disabled={loading} onClick={onComplete}>
              {loading ? "Creating vault…" : "Create vault"}
            </Button>
          </div>
        </>
      )}

      {error && <Alert variant="danger">{error}</Alert>}
    </Card>
  );
}
