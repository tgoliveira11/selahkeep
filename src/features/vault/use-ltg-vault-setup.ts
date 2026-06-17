"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import {
  VAULT_VERSION_V2,
  generateUserVaultKey,
  createEncryptedVaultSettings,
  createEmptyEncryptedVaultIndex,
} from "@/lib/crypto-client/vault";
import {
  wrapVaultKeyForPassword,
  wrapVaultKeyForRecoveryPhrase,
} from "@/lib/crypto-client/vault-envelope";
import {
  generateRecoveryPhrase,
  assertRecoveryPhraseConfirmation,
  type RecoveryPhraseLength,
} from "@/lib/crypto-client/recovery-phrase";
import { unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { vaultApi } from "@/lib/api-client/vault";
import { validatePasswordSetup } from "@tgoliveira/secure-auth/client/password-policy";
import type { PasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";

export type VaultSetupStep =
  | "intro"
  | "password"
  | "phrase-length"
  | "phrase-display"
  | "phrase-confirm"
  | "saving";

export function useLtgVaultSetup(vaultPasswordPolicy: PasswordPolicyConfig) {
  const { data: session } = useSession();
  const [step, setStep] = useState<VaultSetupStep>("intro");
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultPasswordConfirm, setVaultPasswordConfirm] = useState("");
  const [phraseLength, setPhraseLength] = useState<RecoveryPhraseLength>(12);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [phraseConfirmation, setPhraseConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePhrase = useCallback((length: RecoveryPhraseLength) => {
    setPhraseLength(length);
    setRecoveryPhrase(generateRecoveryPhrase(length));
    setPhraseConfirmation("");
    setStep("phrase-display");
  }, []);

  const completeSetup = useCallback(async () => {
    if (!session?.user?.id) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      assertRecoveryPhraseConfirmation(recoveryPhrase, phraseConfirmation);

      const passwordValidation = validatePasswordSetup({
        password: vaultPassword,
        confirmation: vaultPasswordConfirm,
        policy: vaultPasswordPolicy,
      });
      if (!passwordValidation.valid) {
        throw new Error("Vault password does not meet the required policy.");
      }

      const userId = session.user.id;
      const vaultKey = await generateUserVaultKey();

      const [passwordEnvelope, recoveryEnvelope, encryptedVaultSettings, encryptedVaultIndex] =
        await Promise.all([
          wrapVaultKeyForPassword(vaultKey, vaultPassword, { userId, resourceId: userId }),
          wrapVaultKeyForRecoveryPhrase(vaultKey, recoveryPhrase, { userId, resourceId: userId }),
          createEncryptedVaultSettings(vaultKey, userId, {
            setupVersion: 1,
            recoveryPhraseLength: phraseLength,
            unlockBehavior: "metadata_only",
          }),
          createEmptyEncryptedVaultIndex(vaultKey, userId),
        ]);

      await vaultApi.setup({
        vaultVersion: VAULT_VERSION_V2,
        encryptedVaultSettings,
        encryptedVaultIndex,
        envelopes: [
          {
            method: "password",
            encryptedVaultKey: passwordEnvelope.encryptedVaultKey,
            kdfMetadata: passwordEnvelope.kdfMetadata,
          },
          {
            method: "recovery_phrase",
            encryptedVaultKey: recoveryEnvelope.encryptedVaultKey,
            kdfMetadata: recoveryEnvelope.kdfMetadata,
            publicMetadata: { phraseLength },
          },
        ],
      });

      unlockVaultSession(vaultKey);
      setStep("saving");
      return vaultKey;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vault setup failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [session, vaultPassword, vaultPasswordConfirm, vaultPasswordPolicy, recoveryPhrase, phraseConfirmation, phraseLength]);

  return {
    step,
    setStep,
    vaultPassword,
    setVaultPassword,
    vaultPasswordConfirm,
    setVaultPasswordConfirm,
    phraseLength,
    recoveryPhrase,
    phraseConfirmation,
    setPhraseConfirmation,
    generatePhrase,
    completeSetup,
    loading,
    error,
    setError,
  };
}
