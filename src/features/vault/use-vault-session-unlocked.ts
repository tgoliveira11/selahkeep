"use client";

import { useSyncExternalStore } from "react";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { isVaultManuallyLocked, subscribeVaultSession } from "@/lib/crypto-client/vault-session";

function getVaultSessionUnlockedSnapshot(): boolean {
  return isVaultUnlocked() && !isVaultManuallyLocked();
}

/** Subscribes to vault session changes without synchronous setState in effects. */
export function useVaultSessionUnlocked(): boolean {
  return useSyncExternalStore(
    subscribeVaultSession,
    getVaultSessionUnlockedSnapshot,
    () => false
  );
}
