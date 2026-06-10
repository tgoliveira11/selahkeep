"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isVaultUnlocked, unwrapVaultKeyFromDevice } from "@/lib/crypto-client/vault";
import {
  isVaultManuallyLocked,
  subscribeVaultSession,
  unlockVaultSession,
} from "@/lib/crypto-client/vault-session";

type VaultGateState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "ready"; userId: string; vaultUnlocked: boolean }
  | { status: "error"; message: string };

/**
 * Ensures the user is authenticated. Silently unlocks from this device's envelope
 * only when the vault was not manually locked.
 */
export function useRequireVault(): VaultGateState & { recheckVault: () => void } {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [state, setState] = useState<VaultGateState>({ status: "loading" });
  const [recheckToken, setRecheckToken] = useState(0);

  const recheckVault = useCallback(() => {
    setRecheckToken((token) => token + 1);
  }, []);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setRecheckToken((token) => token + 1);
    });
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "unauthenticated") {
      setState({ status: "redirecting" });
      router.push("/login");
      return;
    }

    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      setState({ status: "error", message: "Session is missing user id." });
      return;
    }

    const userId: string = sessionUserId;
    let cancelled = false;

    async function ensureAuth() {
      if (isVaultManuallyLocked()) {
        if (!cancelled) {
          setState({ status: "ready", userId, vaultUnlocked: false });
        }
        return;
      }

      let vaultUnlocked = isVaultUnlocked();

      if (!vaultUnlocked) {
        try {
          await unwrapVaultKeyFromDevice(userId, undefined, { explicit: false });
          vaultUnlocked = isVaultUnlocked();
        } catch {
          vaultUnlocked = false;
        }
      }

      if (!cancelled) {
        setState({ status: "ready", userId, vaultUnlocked });
      }
    }

    ensureAuth();

    return () => {
      cancelled = true;
    };
  }, [authStatus, session?.user?.id, router, recheckToken]);

  return { ...state, recheckVault };
}

/** Call after generating a new vault key during first-time setup. */
export function rememberVaultKey(vaultKey: CryptoKey): void {
  unlockVaultSession(vaultKey);
}
