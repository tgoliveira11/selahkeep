"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { wrapVaultKeyForRecoveryPhrase } from "@/lib/crypto-client/vault-envelope";
import {
  assertRecoveryPhraseConfirmation,
  generateRecoveryPhrase,
  type RecoveryPhraseLength,
} from "@/lib/crypto-client/recovery-phrase";
import { vaultApi } from "@/lib/api-client/vault";

export type ReplaceRecoveryPhraseStep =
  | "idle"
  | "phrase-length"
  | "phrase-display"
  | "phrase-confirm"
  | "saving"
  | "done";

export function useReplaceRecoveryPhrase(onReplaced: () => void) {
  const { data: session } = useSession();
  const [step, setStep] = useState<ReplaceRecoveryPhraseStep>("idle");
  const [phraseLength, setPhraseLength] = useState<RecoveryPhraseLength>(12);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [phraseConfirmation, setPhraseConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setRecoveryPhrase("");
    setPhraseConfirmation("");
    setError(null);
  }, []);

  const startReplace = useCallback(() => {
    setError(null);
    setStep("phrase-length");
  }, []);

  const generatePhrase = useCallback((length: RecoveryPhraseLength) => {
    setPhraseLength(length);
    setRecoveryPhrase(generateRecoveryPhrase(length));
    setPhraseConfirmation("");
    setStep("phrase-display");
  }, []);

  const replacePhrase = useCallback(async () => {
    if (!session?.user?.id) {
      setError("Not authenticated");
      return;
    }

    const vaultKey = getSessionVaultKey();
    if (!vaultKey) {
      setError("Unlock your vault before replacing your recovery phrase.");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("saving");

    try {
      assertRecoveryPhraseConfirmation(recoveryPhrase, phraseConfirmation);

      const userId = session.user.id;
      const recoveryEnvelope = await wrapVaultKeyForRecoveryPhrase(vaultKey, recoveryPhrase, {
        userId,
        resourceId: userId,
      });

      await vaultApi.replaceRecoveryPhrase({
        encryptedVaultKey: recoveryEnvelope.encryptedVaultKey,
        kdfMetadata: recoveryEnvelope.kdfMetadata,
        publicMetadata: { phraseLength },
      });

      setRecoveryPhrase("");
      setPhraseConfirmation("");
      setStep("done");
      onReplaced();
    } catch (e) {
      setStep("phrase-confirm");
      setError(e instanceof Error ? e.message : "Failed to replace recovery phrase");
    } finally {
      setLoading(false);
    }
  }, [session, recoveryPhrase, phraseConfirmation, phraseLength, onReplaced]);

  return {
    step,
    setStep,
    phraseLength,
    recoveryPhrase,
    phraseConfirmation,
    setPhraseConfirmation,
    loading,
    error,
    reset,
    startReplace,
    generatePhrase,
    replacePhrase,
  };
}
