"use client";

import { useSyncExternalStore } from "react";
import { hasUnlockedVaultSession, subscribeVaultSession } from "@/lib/crypto-client/vault-session";

function getVaultSessionUnlockedSnapshot(): boolean {
  return hasUnlockedVaultSession();
}

/** Subscribes to vault session changes without synchronous setState in effects. */
export function useVaultSessionUnlocked(): boolean {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeVaultSession(() => {
        onStoreChange();
      }),
    getVaultSessionUnlockedSnapshot,
    () => false
  );
}
