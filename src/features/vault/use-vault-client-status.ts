"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { vaultApi, type VaultStatus } from "@/lib/api-client/vault";
import {
  deriveClientStatusFromServer,
  type VaultClientStatus,
  type VaultSetupPhase,
} from "@/lib/vault/vault-status";
import { useVaultSessionUnlocked } from "@/features/vault/use-vault-session-unlocked";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";

type VaultClientStatusState =
  | { status: "loading" }
  | { status: "ready"; serverStatus: VaultStatus; setupPhase: VaultSetupPhase; clientStatus: VaultClientStatus }
  | { status: "error"; message: string };

export function useVaultClientStatus(): VaultClientStatusState & { recheck: () => void } {
  const { status: authStatus } = useSession();
  const vaultUnlocked = useVaultSessionUnlocked();
  const [serverStatus, setServerStatus] = useState<VaultStatus | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [recheckToken, setRecheckToken] = useState(0);

  const recheck = useCallback(() => {
    setRecheckToken((token) => token + 1);
  }, []);

  useEffect(() => subscribeVaultSession(recheck), [recheck]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    let cancelled = false;

    vaultApi
      .status()
      .then((status) => {
        if (!cancelled) {
          setServerStatus(status);
          setFetchError(null);
          setHasLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setServerStatus(null);
          setFetchError(error instanceof Error ? error.message : "Failed to load vault status");
          setHasLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, recheckToken]);

  if (authStatus === "loading" || (authStatus === "authenticated" && !hasLoaded)) {
    return { status: "loading", recheck };
  }

  if (fetchError || !serverStatus) {
    return {
      status: "error",
      message: fetchError ?? "Failed to load vault status",
      recheck,
    };
  }

  const clientStatus = deriveClientStatusFromServer(serverStatus, vaultUnlocked);

  return {
    status: "ready",
    serverStatus,
    setupPhase: serverStatus.setupPhase,
    clientStatus,
    recheck,
  };
}
