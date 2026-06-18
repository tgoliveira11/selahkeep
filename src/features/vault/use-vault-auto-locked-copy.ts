"use client";

import { useEffect, useState } from "react";
import {
  subscribeVaultSession,
  wasVaultLockedByInactivity,
} from "@/lib/crypto-client/vault-session";
import { useVaultSessionUnlocked } from "@/features/vault/use-vault-session-unlocked";

/** Tracks whether the vault was locked by inactivity (for locked-state copy). */
export function useVaultAutoLockedCopy(): boolean {
  const vaultUnlocked = useVaultSessionUnlocked();
  const [autoLocked, setAutoLocked] = useState(false);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setAutoLocked(wasVaultLockedByInactivity());
    });
  }, []);

  return !vaultUnlocked && autoLocked;
}
