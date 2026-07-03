"use client";

import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  maybeUpgradePasswordEnvelopeAfterUnlock,
  maybeUpgradeRecoveryEnvelopeAfterUnlock,
  withVaultUnlockRateLimit,
  type EncryptedPayload as VaultCoreEncryptedPayload,
} from "@tgoliveira/vault-core";
import { unwrapVaultKeyFromRecovery } from "@/lib/crypto-client/vault";
import {
  hasUnlockedVaultSession,
  lockVaultSessionManually,
  registerVaultUnloadGuard,
} from "@/lib/crypto-client/vault-session";
import { vaultApi } from "@/lib/api-client/vault";
import { unlockVaultWithPasskey } from "@/features/passkey/unlock-with-passkey";
import { recordVaultSecurityEvent } from "@/features/vault/record-vault-security-event";
import {
  unwrapVaultKeyFromPassword,
  unwrapVaultKeyFromRecoveryPhrase,
} from "@/lib/crypto-client/vault-envelope";
import type { KdfMetadata, EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { getVaultUnlockRateLimiter } from "@/lib/vault/vault-rate-limit";
import { envelopeScope } from "@/lib/vault/vault-envelope-scope";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";

export function useVault() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlockLimiter = getVaultUnlockRateLimiter();
  const userId = session?.user?.id;

  useEffect(() => {
    return registerVaultUnloadGuard();
  }, []);

  const lockVault = useCallback(() => {
    lockVaultSessionManually();
  }, []);

  const unlockFromPasskey = useCallback(
    async (
      prefetchedOptions?: PublicKeyCredentialRequestOptionsJSON | null,
      credentialId?: string
    ) => {
      if (!userId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const key = await withVaultUnlockRateLimit(unlockLimiter, userId, "passkey_prf", async () =>
          unlockVaultWithPasskey(userId, credentialId, prefetchedOptions)
        );
        void recordVaultSecurityEvent("vault_unlocked", { method: "passkey_prf" });
        return key;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Passkey unlock failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [unlockLimiter, userId]
  );

  const unlockFromRecoveryCode = useCallback(
    async (recoveryCode: string) => {
      if (!userId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        await withVaultUnlockRateLimit(unlockLimiter, userId, "recovery_phrase", async () => {
          const { encryptedVaultKey, kdfMetadata } = await vaultApi.unlockWithRecoveryCode();
          if (!encryptedVaultKey || !kdfMetadata) {
            throw new Error("No recovery code configured");
          }
          await unwrapVaultKeyFromRecovery(recoveryCode, encryptedVaultKey, kdfMetadata, {
            applySession: true,
          });
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Recovery unlock failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [unlockLimiter, userId]
  );

  const unlockFromVaultPassword = useCallback(
    async (vaultPassword: string) => {
      if (!userId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const vaultKey = await withVaultUnlockRateLimit(unlockLimiter, userId, "password", async () => {
          const { encryptedVaultKey, kdfMetadata } = await vaultApi.unlockEnvelope("password");
          if (!encryptedVaultKey || !kdfMetadata) {
            throw new Error("Vault password unlock is not configured");
          }
          const scope = envelopeScope(userId);
          const key = await unwrapVaultKeyFromPassword(
            vaultPassword,
            encryptedVaultKey,
            kdfMetadata as KdfMetadata,
            {
              applySession: true,
              unlockMethod: "password",
              userId,
            }
          );
          const upgrade = await maybeUpgradePasswordEnvelopeAfterUnlock({
            vaultKey: key,
            vaultPassword,
            envelope: {
              encryptedVaultKey: encryptedVaultKey as VaultCoreEncryptedPayload,
              kdfMetadata,
            } as Parameters<typeof maybeUpgradePasswordEnvelopeAfterUnlock>[0]["envelope"],
            scope,
            profile: SELAHKEEP_VAULT_PROFILE,
          });
          void upgrade;
          return key;
        });
        void recordVaultSecurityEvent("vault_unlocked", { method: "password" });
        return vaultKey;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vault password unlock failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [unlockLimiter, userId]
  );

  const unlockFromRecoveryPhrase = useCallback(
    async (recoveryPhrase: string) => {
      if (!userId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const vaultKey = await withVaultUnlockRateLimit(
          unlockLimiter,
          userId,
          "recovery_phrase",
          async () => {
            const { encryptedVaultKey, kdfMetadata, publicMetadata } =
              await vaultApi.unlockEnvelope("recovery_phrase");
            if (!encryptedVaultKey || !kdfMetadata) {
              throw new Error("Recovery phrase unlock is not configured");
            }
            const scope = envelopeScope(userId);
            const key = await unwrapVaultKeyFromRecoveryPhrase(
              recoveryPhrase,
              encryptedVaultKey,
              kdfMetadata as KdfMetadata,
              {
                applySession: true,
                unlockMethod: "recovery_phrase",
                userId,
                expectedWordCount:
                  publicMetadata?.phraseLength === 12 || publicMetadata?.phraseLength === 24
                    ? publicMetadata.phraseLength
                    : undefined,
              }
            );
            const upgrade = await maybeUpgradeRecoveryEnvelopeAfterUnlock({
              vaultKey: key,
              recoveryPhrase,
              envelope: {
                encryptedVaultKey: encryptedVaultKey as VaultCoreEncryptedPayload,
                kdfMetadata,
                publicMetadata,
              } as Parameters<typeof maybeUpgradeRecoveryEnvelopeAfterUnlock>[0]["envelope"],
              scope,
              profile: SELAHKEEP_VAULT_PROFILE,
            });
            if (upgrade.upgradedEnvelope) {
              await vaultApi.replaceRecoveryPhrase({
                encryptedVaultKey: upgrade.upgradedEnvelope
                  .encryptedVaultKey as EncryptedPayload,
                kdfMetadata: upgrade.upgradedEnvelope.kdfMetadata as KdfMetadata,
                publicMetadata: upgrade.upgradedEnvelope.publicMetadata as
                  | { phraseLength: 12 | 24 }
                  | undefined,
              });
            }
            return key;
          }
        );
        void recordVaultSecurityEvent("vault_unlocked", { method: "recovery_phrase" });
        return vaultKey;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Recovery phrase unlock failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [unlockLimiter, userId]
  );

  return {
    loading,
    error,
    isUnlocked: hasUnlockedVaultSession(),
    unlockFromPasskey,
    unlockFromRecoveryCode,
    unlockFromVaultPassword,
    unlockFromRecoveryPhrase,
    lockVault,
  };
}
