"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  VaultDockQuickUnlock,
  VaultStatusDock as CoreVaultStatusDock,
  createVaultFullUnlockPageMatcher,
} from "@tgoliveira/vault-core/react";
import { isPrfExtensionSupported } from "@tgoliveira/vault-core/browser";
import { Alert } from "@/components/ui/alert";
import { useVault } from "@/features/vault/use-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { useVaultPasskeyUnlockPrefetch } from "@/features/passkey/use-vault-passkey-unlock-prefetch";
import { useVaultDockPasskeyAvailable } from "@/features/vault/use-vault-dock-passkey-available";
import { hasUnlockedVaultSession } from "@/lib/crypto-client/vault";
import { buildVaultUnlockHref } from "@/lib/notes/safe-return-to";
import { getVaultUnlockRateLimiter } from "@/lib/vault/vault-rate-limit";
import { toVaultServerStatusSnapshot } from "@/lib/vault/vault-server-snapshot";
import { isVaultFullUnlockPage } from "@/features/vault/vault-status-dock-routes";
import { lockVaultSessionManually, touchVaultSession } from "@/lib/crypto-client/vault-session";

const UNLOCK_PATH = "/vault/unlock";
const DOCK_COLLAPSED_KEY = "selahkeep:vault-status-dock:collapsed";

export function VaultStatusDock() {
  const { status: authStatus, data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const vaultClient = useVaultClientStatus();
  const {
    loading,
    error,
    unlockFromPasskey,
    unlockFromVaultPassword,
  } = useVault();
  const serverStatus = vaultClient.status === "ready" ? vaultClient.serverStatus : null;
  const passkeyAvailability = useVaultDockPasskeyAvailable(serverStatus);
  const { options: prefetchedOptions } = useVaultPasskeyUnlockPrefetch(passkeyAvailability.showPasskey);
  /** Survives VaultDockQuickUnlock remounts (e.g. React Strict Mode, page re-render on unlock). */
  const passkeyUnlockInFlightRef = useRef(false);

  const runDockPasskeyUnlock = useCallback(
    async (collapse: () => void) => {
      if (!passkeyAvailability.showPasskey || passkeyUnlockInFlightRef.current) return;
      passkeyUnlockInFlightRef.current = true;
      try {
        await unlockFromPasskey(prefetchedOptions ?? undefined);
        collapse();
      } finally {
        passkeyUnlockInFlightRef.current = false;
      }
    },
    [passkeyAvailability.showPasskey, prefetchedOptions, unlockFromPasskey]
  );

  const handleDockPasskeyUnlockFailed = useCallback(
    (error: unknown, onNavigateToUnlockPage: (error: unknown) => void) => {
      if (hasUnlockedVaultSession()) return;
      onNavigateToUnlockPage(error);
    },
    []
  );

  if (authStatus !== "authenticated") return null;
  if (vaultClient.status !== "ready") return null;
  if (isVaultFullUnlockPage(pathname)) return null;

  const { clientStatus } = vaultClient;
  const snapshot = toVaultServerStatusSnapshot(serverStatus!);
  const returnPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const rateLimiter = getVaultUnlockRateLimiter();
  const rateLimitScopeKey = session?.user?.id ?? "vault";

  return (
    <CoreVaultStatusDock
      visible
      serverStatus={snapshot}
      prfSupported={isPrfExtensionSupported()}
      pathname={pathname}
      unlockPath={UNLOCK_PATH}
      buildUnlockHref={(path) => buildVaultUnlockHref(path ?? returnPath)}
      isFullUnlockPage={createVaultFullUnlockPageMatcher(UNLOCK_PATH)}
      quickUnlockEnabled={clientStatus !== "not_configured" && clientStatus !== "setup_incomplete"}
      redirectOnPasskeyUnlockFailure
      loading={loading}
      unlockError={error}
      collapsedPreferenceKey={DOCK_COLLAPSED_KEY}
      LinkComponent={Link}
      onLock={() => lockVaultSessionManually()}
      onStayUnlocked={() => touchVaultSession()}
      onNavigateToUnlock={(href) => router.push(href)}
      renderQuickUnlock={({
        loading: dockLoading,
        error: dockError,
        collapse,
        onPasskeyUnlockFailed,
      }) => (
        <VaultDockQuickUnlock
          loading={dockLoading}
          error={dockError}
          serverStatus={snapshot}
          passkeyReady={passkeyAvailability.showPasskey}
          unlockRateLimiter={rateLimiter}
          rateLimitScopeKey={rateLimitScopeKey}
          onPasskeyUnlockFailed={(error) =>
            handleDockPasskeyUnlockFailed(error, onPasskeyUnlockFailed)
          }
          onUnlockPassword={async (password) => {
            await unlockFromVaultPassword(password);
            collapse();
          }}
          onUnlockPasskey={
            passkeyAvailability.showPasskey
              ? () => runDockPasskeyUnlock(collapse)
              : undefined
          }
          renderError={(message) => (
            <Alert variant="danger" title="Unlock failed">
              {message}
            </Alert>
          )}
        />
      )}
    />
  );
}
