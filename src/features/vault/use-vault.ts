"use client";

import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
import type { KdfMetadata } from "@/lib/validation/encrypted-payload";

export function useVault() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return registerVaultUnloadGuard();
  }, []);

  const lockVault = useCallback(() => {
    lockVaultSessionManually();
  }, []);

  const unlockFromPasskey = useCallback(
    async (prefetchedOptions?: PublicKeyCredentialRequestOptionsJSON | null) => {
    if (!session?.user?.id) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      const key = await unlockVaultWithPasskey(session.user.id, undefined, prefetchedOptions);
      void recordVaultSecurityEvent("vault_unlocked", { method: "passkey_prf" });
      return key;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey unlock failed");
      throw e;
    } finally {
      setLoading(false);
    }
  },
  [session]
);

  const unlockFromRecoveryCode = useCallback(
    async (recoveryCode: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const { encryptedVaultKey, kdfMetadata } = await vaultApi.unlockWithRecoveryCode();
        if (!encryptedVaultKey || !kdfMetadata) {
          throw new Error("No recovery code configured");
        }
        await unwrapVaultKeyFromRecovery(recoveryCode, encryptedVaultKey, kdfMetadata, {
          applySession: true,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Recovery unlock failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const unlockFromVaultPassword = useCallback(
    async (vaultPassword: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const { encryptedVaultKey, kdfMetadata } = await vaultApi.unlockEnvelope("password");
        if (!encryptedVaultKey || !kdfMetadata) {
          throw new Error("Vault password unlock is not configured");
        }
        const vaultKey = await unwrapVaultKeyFromPassword(
          vaultPassword,
          encryptedVaultKey,
          kdfMetadata as KdfMetadata,
          {
            applySession: true,
            unlockMethod: "password",
            userId: session.user.id,
          }
        );
        void recordVaultSecurityEvent("vault_unlocked", { method: "password" });
        return vaultKey;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vault password unlock failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const unlockFromRecoveryPhrase = useCallback(
    async (recoveryPhrase: string) => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const { encryptedVaultKey, kdfMetadata } = await vaultApi.unlockEnvelope("recovery_phrase");
        if (!encryptedVaultKey || !kdfMetadata) {
          throw new Error("Recovery phrase unlock is not configured");
        }
        const vaultKey = await unwrapVaultKeyFromRecoveryPhrase(
          recoveryPhrase,
          encryptedVaultKey,
          kdfMetadata as KdfMetadata,
          {
            applySession: true,
            unlockMethod: "recovery_phrase",
            userId: session.user.id,
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
    [session]
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
