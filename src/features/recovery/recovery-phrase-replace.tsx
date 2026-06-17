"use client";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { SuccessState } from "@/components/ui/success-state";
import type { RecoveryPhraseStatus } from "@/lib/api-client/vault";
import { useReplaceRecoveryPhrase } from "./use-replace-recovery-phrase";

function formatRecoveryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface RecoveryPhraseReplaceProps {
  recoveryPhrase: RecoveryPhraseStatus;
  onReplaced: () => void;
}

export function RecoveryPhraseReplace({ recoveryPhrase, onReplaced }: RecoveryPhraseReplaceProps) {
  const replace = useReplaceRecoveryPhrase(onReplaced);

  if (replace.step === "idle") {
    return (
      <div className="space-y-4">
        <SuccessState message="Your recovery phrase is configured. Keep the copy you saved somewhere safe offline." />
        <dl className="grid gap-2 text-sm text-[var(--muted)]">
          <div>
            <dt className="font-medium text-[var(--foreground)]">First configured</dt>
            <dd>{formatRecoveryDate(recoveryPhrase.createdAt)}</dd>
          </div>
          {recoveryPhrase.replacedAt && (
            <div>
              <dt className="font-medium text-[var(--foreground)]">Last replaced</dt>
              <dd>{formatRecoveryDate(recoveryPhrase.replacedAt)}</dd>
            </div>
          )}
          {recoveryPhrase.phraseLength && (
            <div>
              <dt className="font-medium text-[var(--foreground)]">Phrase length</dt>
              <dd>{recoveryPhrase.phraseLength} words</dd>
            </div>
          )}
        </dl>
        <Alert variant="warning" title="Replacing your recovery phrase">
          Replacing generates a new phrase and invalidates the previous one. Store the new phrase
          offline before finishing. Your vault password and notes stay the same.
        </Alert>
        <Button onClick={replace.startReplace} className="w-full sm:w-auto">
          Replace recovery phrase
        </Button>
      </div>
    );
  }

  if (replace.step === "phrase-length") {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Choose the length for your new recovery phrase. A longer phrase is stronger.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => replace.generatePhrase(12)}>
            12 words
          </Button>
          <Button onClick={() => replace.generatePhrase(24)}>24 words</Button>
        </div>
        <Button variant="secondary" onClick={replace.reset}>
          Cancel
        </Button>
      </div>
    );
  }

  if (replace.step === "phrase-display") {
    return (
      <div className="space-y-4">
        <Alert variant="warning" title="Save your new recovery phrase now">
          This is the only time we can show it. Store it offline before continuing.
        </Alert>
        <div
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-4 font-mono text-sm leading-relaxed"
          data-testid="recovery-phrase-display"
        >
          {replace.recoveryPhrase}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={replace.reset}>
            Cancel
          </Button>
          <Button onClick={() => replace.setStep("phrase-confirm")}>I have saved my phrase</Button>
        </div>
      </div>
    );
  }

  if (replace.step === "phrase-confirm" || replace.step === "saving") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">
          Enter your new recovery phrase exactly to confirm you saved it.
        </p>
        <FormField label="Recovery phrase" id="replace-phrase-confirm">
          <Textarea
            id="replace-phrase-confirm"
            rows={4}
            value={replace.phraseConfirmation}
            onChange={(e) => replace.setPhraseConfirmation(e.target.value)}
            placeholder="Enter your new recovery phrase"
            disabled={replace.loading}
          />
        </FormField>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            onClick={() => replace.setStep("phrase-display")}
            disabled={replace.loading}
          >
            Back
          </Button>
          <Button onClick={replace.replacePhrase} disabled={replace.loading}>
            {replace.loading ? "Replacing…" : "Replace recovery phrase"}
          </Button>
        </div>
        {replace.error && (
          <Alert variant="danger" role="alert">
            {replace.error}
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SuccessState message="Your recovery phrase was replaced. The previous phrase no longer unlocks your vault." />
      <Button variant="secondary" onClick={replace.reset}>
        Done
      </Button>
    </div>
  );
}
