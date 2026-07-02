"use client";

import { useCallback, useEffect, useState } from "react";
import { vaultApi } from "@/lib/api-client/vault";
import {
  decryptVaultSettings,
  encryptVaultSettings,
  defaultVaultSettings,
  type VaultSettingsPlaintext,
  type VaultUnlockBehavior,
} from "@/lib/crypto-client/vault-settings";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";

export function useVaultSettings(userId: string | null, vaultUnlocked: boolean) {
  const canLoad = Boolean(userId && vaultUnlocked);
  const [settings, setSettings] = useState<VaultSettingsPlaintext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!canLoad) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { encryptedVaultSettings } = await vaultApi.getSettings();
        const vaultKey = getSessionVaultKey();
        if (!vaultKey) {
          if (!cancelled) setSettings(null);
          return;
        }
        const decrypted = encryptedVaultSettings
          ? await decryptVaultSettings(encryptedVaultSettings, userId!, vaultKey)
          : defaultVaultSettings();
        if (!cancelled) setSettings(decrypted);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load vault settings");
          setSettings(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [canLoad, reloadToken]);

  useEffect(() => subscribeVaultSession(() => setSettings(null)), []);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const updateUnlockBehavior = useCallback(
    async (unlockBehavior: VaultUnlockBehavior) => {
      if (!userId || !settings) throw new Error("Vault settings unavailable");
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) throw new Error("Vault is locked");

      const next = { ...settings, unlockBehavior };
      const encrypted = await encryptVaultSettings(next, userId, vaultKey);
      await vaultApi.updateSettings(encrypted);
      setSettings(next);
      return next;
    },
    [userId, settings]
  );

  return {
    settings: canLoad ? settings : null,
    loading: canLoad ? loading : false,
    error: canLoad ? error : null,
    reload,
    updateUnlockBehavior,
  };
}
