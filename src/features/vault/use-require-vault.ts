"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasUnlockedVaultSession } from "@/lib/crypto-client/vault";
import { purgeTrustedDeviceIdb } from "@/lib/crypto-client/vault-idb-cleanup";
import {
  isVaultManuallyLocked,
  setUnlockedVaultSession,
  subscribeVaultSession,
} from "@/lib/crypto-client/vault-session";
import { applyUnlockBehavior, clearNoteBodyCache } from "@/features/notes/eager-decrypt-notes";

type VaultGateState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "ready"; userId: string; vaultUnlocked: boolean }
  | { status: "error"; message: string };

type VaultReadyState =
  | { status: "pending" }
  | { status: "ready"; userId: string; vaultUnlocked: boolean }
  | { status: "error"; message: string };

/**
 * Ensures the user is authenticated. Account session alone never unlocks the vault.
 */
export function useRequireVault(): VaultGateState & { recheckVault: () => void } {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [readyState, setReadyState] = useState<VaultReadyState>({ status: "pending" });
  const [recheckToken, setRecheckToken] = useState(0);

  const recheckVault = useCallback(() => {
    setRecheckToken((token) => token + 1);
  }, []);

  useEffect(() => {
    return subscribeVaultSession(() => {
      clearNoteBodyCache();
      setRecheckToken((token) => token + 1);
    });
  }, []);

  useEffect(() => {
    void purgeTrustedDeviceIdb();
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "loading" || authStatus === "unauthenticated") {
      return;
    }

    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      return;
    }

    const userId: string = sessionUserId;
    let cancelled = false;

    async function ensureAuth() {
      if (isVaultManuallyLocked()) {
        if (!cancelled) {
          setReadyState({ status: "ready", userId, vaultUnlocked: false });
        }
        return;
      }

      const vaultUnlocked = hasUnlockedVaultSession();

      if (!cancelled) {
        setReadyState({ status: "ready", userId, vaultUnlocked });
      }

      if (vaultUnlocked && !cancelled) {
        void applyUnlockBehavior(userId).catch(() => undefined);
      }
    }

    ensureAuth();

    return () => {
      cancelled = true;
    };
  }, [authStatus, session?.user?.id, recheckToken]);

  if (authStatus === "loading") {
    return { status: "loading", recheckVault };
  }

  if (authStatus === "unauthenticated") {
    return { status: "redirecting", recheckVault };
  }

  if (authStatus === "authenticated" && !session?.user?.id) {
    return { status: "error", message: "Session is missing user id.", recheckVault };
  }

  if (readyState.status === "pending") {
    return { status: "loading", recheckVault };
  }

  return { ...readyState, recheckVault };
}

/** Call after generating a new vault key during first-time setup. */
export function rememberVaultKey(vaultKey: CryptoKey): void {
  setUnlockedVaultSession({ userVaultKey: vaultKey, method: "password" });
}
