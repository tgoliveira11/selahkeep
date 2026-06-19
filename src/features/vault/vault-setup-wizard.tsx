"use client";

import { useMemo, useState } from "react";
import { PasswordSetupFields } from "@tgoliveira/secure-auth/react/client";
import type { PasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { VaultSetupStep } from "./use-ltg-vault-setup";
import type { RecoveryPhraseLength } from "@/lib/crypto-client/recovery-phrase";
import {
  buildRecoveryPhraseDownloadContent,
  downloadRecoveryPhraseFile,
} from "@/lib/crypto-client/recovery-phrase-download";
import { PRODUCT_NAME } from "@/lib/marketing/brand";

interface VaultSetupWizardProps {
  step: VaultSetupStep;
  loading: boolean;
  error: string | null;
  vaultPasswordPolicy: PasswordPolicyConfig;
  vaultPassword: string;
  vaultPasswordConfirm: string;
  recoveryPhrase: string;
  challengeIndices: number[];
  challengeAnswers: Record<number, string>;
  onVaultPasswordChange: (value: string) => void;
  onVaultPasswordConfirmChange: (value: string) => void;
  onChallengeAnswerChange: (index: number, value: string) => void;
  onSetStep: (step: VaultSetupStep) => void;
  onGeneratePhrase: (length: RecoveryPhraseLength) => void;
  onBeginPhraseConfirmation: () => void;
  onComplete: () => void;
}

export function VaultSetupWizard({
  step,
  loading,
  error,
  vaultPasswordPolicy,
  vaultPassword,
  vaultPasswordConfirm,
  recoveryPhrase,
  challengeIndices,
  challengeAnswers,
  onVaultPasswordChange,
  onVaultPasswordConfirmChange,
  onChallengeAnswerChange,
  onSetStep,
  onGeneratePhrase,
  onBeginPhraseConfirmation,
  onComplete,
}: VaultSetupWizardProps) {
  const [passwordStepValid, setPasswordStepValid] = useState(false);
  const [savedSecurely, setSavedSecurely] = useState(false);
  const [copied, setCopied] = useState(false);

  const canConfirmChallenge = useMemo(
    () =>
      challengeIndices.every((index) => (challengeAnswers[index] ?? "").trim().length > 0),
    [challengeAnswers, challengeIndices]
  );

  async function copyRecoveryPhrase() {
    await navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true);
  }

  return (
    <Card className="space-y-5 p-6">
      {step === "intro" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Set up {PRODUCT_NAME}</h2>
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
              Your account password signs you in. Your vault password unlocks your private notes.
            </p>
          </div>
          <PasswordSetupFields
            passwordId="vault-password"
            confirmId="vault-password-confirm"
            passwordName="vaultPassword"
            confirmName="confirmVaultPassword"
            passwordLabel="Vault password"
            confirmLabel="Confirm vault password"
            value={vaultPassword}
            confirmValue={vaultPasswordConfirm}
            onChange={onVaultPasswordChange}
            onConfirmChange={onVaultPasswordConfirmChange}
            policy={vaultPasswordPolicy}
            feedbackPosition="above"
            passwordPlaceholder="Choose a vault password"
            confirmPlaceholder="Confirm your vault password"
            onValidityChange={(isValid) => setPasswordStepValid(isValid)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => onSetStep("intro")}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!passwordStepValid}
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
          <Alert variant="warning">
            Store this phrase securely. Anyone with this phrase can unlock your vault.
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={() => void copyRecoveryPhrase()}>
              {copied ? "Copied" : "Copy recovery phrase"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => downloadRecoveryPhraseFile(recoveryPhrase)}
            >
              Download recovery phrase
            </Button>
          </div>
          <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={savedSecurely}
              onChange={(event) => setSavedSecurely(event.target.checked)}
            />
            <span>I saved this securely</span>
          </label>
          <Button className="w-full" disabled={!savedSecurely} onClick={onBeginPhraseConfirmation}>
            Continue
          </Button>
        </>
      )}

      {step === "phrase-confirm" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Confirm your recovery phrase</h2>
            <p className="text-sm text-[var(--muted)]">
              To make sure you saved it correctly, enter the requested words from your recovery
              phrase.
            </p>
          </div>
          <div className="space-y-3">
            {challengeIndices.map((index) => (
              <FormField
                key={index}
                label={`Word #${index}`}
                id={`recovery-phrase-word-${index}`}
              >
                <Input
                  id={`recovery-phrase-word-${index}`}
                  aria-label={`Recovery phrase word number ${index}`}
                  value={challengeAnswers[index] ?? ""}
                  onChange={(event) => onChallengeAnswerChange(index, event.target.value)}
                  autoComplete="off"
                />
              </FormField>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => onSetStep("phrase-display")}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={loading || !canConfirmChallenge}
              onClick={onComplete}
            >
              {loading ? "Creating vault…" : "Confirm recovery phrase"}
            </Button>
          </div>
        </>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {step === "phrase-display" && (
        <span className="sr-only" data-testid="recovery-phrase-download-content">
          {buildRecoveryPhraseDownloadContent(recoveryPhrase)}
        </span>
      )}
    </Card>
  );
}
