"use client";

import { useCallback, useEffect, useState } from "react";
import { vaultApi } from "@/lib/api-client/vault";
import {
  createEmptyVaultIndex,
  decryptVaultIndex,
  encryptVaultIndex,
  type VaultIndexPlaintext,
} from "@/lib/crypto-client/vault-index";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";

export function useVaultIndex(userId: string | null, vaultUnlocked: boolean) {
  const [index, setIndex] = useState<VaultIndexPlaintext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!userId || !vaultUnlocked) {
      setIndex(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { encryptedVaultIndex } = await vaultApi.getIndex();
        const vaultKey = getSessionVaultKey();
        if (!vaultKey) {
          if (!cancelled) setIndex(null);
          return;
        }
        const decrypted = encryptedVaultIndex
          ? await decryptVaultIndex(encryptedVaultIndex, vaultKey)
          : createEmptyVaultIndex();
        if (!cancelled) setIndex(decrypted);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load vault index");
          setIndex(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, vaultUnlocked, reloadToken]);

  useEffect(() => subscribeVaultSession(() => setIndex(null)), []);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const persistIndex = useCallback(
    async (next: VaultIndexPlaintext) => {
      if (!userId) throw new Error("Not authenticated");
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) throw new Error("Vault is locked");

      const encrypted = await encryptVaultIndex(next, userId, vaultKey);
      await vaultApi.updateIndex(encrypted);
      setIndex(next);
    },
    [userId]
  );

  const mutateIndex = useCallback(
    async (mutate: (current: VaultIndexPlaintext) => VaultIndexPlaintext) => {
      const vaultKey = getSessionVaultKey();
      if (!vaultKey) throw new Error("Vault is locked");

      const { encryptedVaultIndex } = await vaultApi.getIndex();
      const current = encryptedVaultIndex
        ? await decryptVaultIndex(encryptedVaultIndex, vaultKey)
        : createEmptyVaultIndex();
      const next = mutate(current);
      await persistIndex(next);
      return next;
    },
    [persistIndex]
  );

  return { index, loading, error, reload, persistIndex, mutateIndex };
}
