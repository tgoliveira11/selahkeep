"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  unwrapVaultKeyFromRecovery,
  isVaultUnlocked,
} from "@/lib/crypto-client/vault";
import {
  lockVaultSessionManually,
  registerVaultUnloadGuard,
  unlockVaultSession,
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

  const unlockFromPasskey = useCallback(async () => {
    if (!session?.user?.id) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      const key = await unlockVaultWithPasskey(session.user.id);
      unlockVaultSession(key);
      void recordVaultSecurityEvent("vault_unlocked", { method: "passkey_prf" });
      return key;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey unlock failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [session]);

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
        await unwrapVaultKeyFromRecovery(
          recoveryCode,
          encryptedVaultKey,
          kdfMetadata,
          { explicit: true }
        );
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
        await unwrapVaultKeyFromPassword(
          vaultPassword,
          encryptedVaultKey,
          kdfMetadata as KdfMetadata,
          { explicit: true }
        );
        void recordVaultSecurityEvent("vault_unlocked", { method: "password" });
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
        await unwrapVaultKeyFromRecoveryPhrase(
          recoveryPhrase,
          encryptedVaultKey,
          kdfMetadata as KdfMetadata,
          { explicit: true }
        );
        void recordVaultSecurityEvent("vault_unlocked", { method: "recovery_phrase" });
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
    isUnlocked: isVaultUnlocked(),
    unlockFromPasskey,
    unlockFromRecoveryCode,
    unlockFromVaultPassword,
    unlockFromRecoveryPhrase,
    lockVault,
  };
}
