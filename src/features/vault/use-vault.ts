"use client";

import { useCallback, useState } from "react";
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
import { vaultApi } from "@/lib/api-client/vault";
import { storeLocalVaultEnvelope } from "@/lib/crypto-client/device-storage";
import { unlockVaultWithPasskey } from "@/features/passkey/unlock-with-passkey";

function getBrowserInfo() {
  if (typeof navigator === "undefined") return { browser: "unknown", platform: "unknown" };
  const ua = navigator.userAgent;
  let browser = "unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  return { browser, platform: navigator.platform ?? "unknown" };
}

export function useVault() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { browser, platform } = getBrowserInfo();

      await vaultApi.init({
        vaultVersion: VAULT_VERSION,
        envelopes: [
          {
            method: "trusted_device",
            encryptedVaultKey,
            trustedDevice: {
              deviceName: `${browser} on ${platform}`,
              browser,
              platform,
              devicePublicKey: { deviceId },
            },
          },
        ],
      });

      // Persist locally only after the server accepts vault init.
      await storeLocalVaultEnvelope(userId, deviceId, encryptedVaultKey);
      setSessionVaultKey(vaultKey);
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
      await unwrapVaultKeyFromDevice(session.user.id);
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
      await unlockVaultWithPasskey(session.user.id);
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
          kdfMetadata
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

  return {
    loading,
    error,
    isUnlocked: isVaultUnlocked(),
    initializeVault,
    unlockFromDevice,
    unlockFromPasskey,
    unlockFromRecoveryCode,
  };
}
