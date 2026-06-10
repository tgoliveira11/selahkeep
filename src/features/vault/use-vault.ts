"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  generateUserVaultKey,
  buildDeviceVaultEnvelope,
  unwrapVaultKeyFromDevice,
  unwrapVaultKeyFromRecovery,
  isVaultUnlocked,
  setSessionVaultKey,
  VAULT_VERSION,
} from "@/lib/crypto-client/vault";
import {
  lockVaultSession,
  registerVaultUnloadGuard,
  touchVaultSession,
  unlockVaultSession,
} from "@/lib/crypto-client/vault-session";
import { vaultApi } from "@/lib/api-client/vault";
import { storeLocalVaultEnvelope } from "@/lib/crypto-client/device-storage";
import { unlockVaultWithPasskey } from "@/features/passkey/unlock-with-passkey";
import { getDeviceDisplayInfo } from "@/lib/device-display-info";

export function useVault() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return registerVaultUnloadGuard();
  }, []);

  const lockVault = useCallback(() => {
    lockVaultSession();
  }, []);

  const initializeVault = useCallback(async () => {
    if (!session?.user?.id) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      const vaultKey = await generateUserVaultKey();
      const userId = session.user.id;
      const { encryptedVaultKey, deviceId } = await buildDeviceVaultEnvelope(
        vaultKey,
        userId,
        userId
      );
      const display = getDeviceDisplayInfo();

      await vaultApi.init({
        vaultVersion: VAULT_VERSION,
        envelopes: [
          {
            method: "trusted_device",
            encryptedVaultKey,
            trustedDevice: {
              deviceName: display.defaultDeviceName,
              browser: display.browser,
              platform: display.platform,
              deviceType: display.deviceType,
              devicePublicKey: { deviceId },
            },
          },
        ],
      });

      // Persist locally only after the server accepts vault init.
      await storeLocalVaultEnvelope(userId, deviceId, encryptedVaultKey);
      unlockVaultSession(vaultKey);
      return vaultKey;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vault initialization failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const unlockFromDevice = useCallback(async () => {
    if (!session?.user?.id) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      const key = await unwrapVaultKeyFromDevice(session.user.id, undefined, {
        explicit: true,
      });
      touchVaultSession();
      return key;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlock failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const unlockFromPasskey = useCallback(async () => {
    if (!session?.user?.id) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      const key = await unlockVaultWithPasskey(session.user.id);
      touchVaultSession();
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
        touchVaultSession();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Recovery unlock failed");
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
    initializeVault,
    unlockFromDevice,
    unlockFromPasskey,
    unlockFromRecoveryCode,
    lockVault,
  };
}
