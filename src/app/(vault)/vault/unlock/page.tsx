"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  VaultUnlockPanel,
  useVaultUnlockPageNavigation,
} from "@tgoliveira/vault-core/react";
import { isPrfExtensionSupported } from "@tgoliveira/vault-core/browser";
import { Alert } from "@/components/ui/alert";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { useVault } from "@/features/vault/use-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { useVaultPasskeyUnlockPrefetch } from "@/features/passkey/use-vault-passkey-unlock-prefetch";
import { useVaultDockPasskeyAvailable } from "@/features/vault/use-vault-dock-passkey-available";
import { VaultStatusPrompt } from "@/features/vault/vault-status-prompt";
import { readSelahkeepVaultUnlockReturnPath } from "@/lib/notes/safe-return-to";
import { getVaultUnlockRateLimiter } from "@/lib/vault/vault-rate-limit";
import { toVaultServerStatusSnapshot } from "@/lib/vault/vault-server-snapshot";
import { PRODUCT_NAME } from "@/lib/marketing/brand";
import { LegacyVaultUnlockPanel } from "@/features/vault/legacy-vault-unlock-panel";

export default function VaultUnlockPage() {
  const { status: authStatus, data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterUnlockPath = readSelahkeepVaultUnlockReturnPath(searchParams);
  const vaultClient = useVaultClientStatus();
  const {
    loading,
    error,
    unlockFromPasskey,
    unlockFromRecoveryCode,
    unlockFromVaultPassword,
    unlockFromRecoveryPhrase,
  } = useVault();
  const serverStatusForPasskey = vaultClient.status === "ready" ? vaultClient.serverStatus : null;
  const passkeyAvailability = useVaultDockPasskeyAvailable(serverStatusForPasskey);
  const { options: prefetchedOptions } = useVaultPasskeyUnlockPrefetch(
    authStatus === "authenticated" && passkeyAvailability.showPasskey
  );
  const rateLimitScopeKey = session?.user?.id ?? "vault";

  const configured =
    vaultClient.status === "ready"
      ? vaultClient.clientStatus !== "not_configured" &&
        vaultClient.clientStatus !== "setup_incomplete"
      : null;

  useVaultUnlockPageNavigation({
    configured,
    returnPath: afterUnlockPath,
    setupPath: "/vault/setup",
    onNavigate: (path) => router.replace(path),
  });

  if (authStatus === "loading" || authStatus === "unauthenticated" || vaultClient.status === "loading") {
    return (
      <PageLayout width="narrow">
        <LoadingState label="Loading your vault" />
      </PageLayout>
    );
  }

  if (vaultClient.status === "error") {
    return (
      <PageLayout width="narrow">
        <ErrorState message={vaultClient.message} />
      </PageLayout>
    );
  }

  const { clientStatus, serverStatus } = vaultClient;

  if (clientStatus === "not_configured" || clientStatus === "setup_incomplete") {
    return (
      <PageLayout width="narrow">
        <PageHeader title={PRODUCT_NAME} description="Your private notes stay encrypted. Only you can unlock them." />
        <VaultStatusPrompt clientStatus={clientStatus} context="unlock" />
      </PageLayout>
    );
  }

  const snapshot = toVaultServerStatusSnapshot(serverStatus);
  const showLtgUnlock = serverStatus.setupComplete && serverStatus.vaultVersion === "vault-v2";
  const rateLimiter = getVaultUnlockRateLimiter();

  return (
    <PageLayout width="narrow">
      <PageHeader
        title={PRODUCT_NAME}
        description="Your private notes stay encrypted. Only you can unlock them."
      />
      {showLtgUnlock ? (
        <VaultUnlockPanel
          loading={loading}
          error={error}
          serverStatus={snapshot}
          prfSupported={isPrfExtensionSupported()}
          passkeyReady={passkeyAvailability.showPasskey}
          unlockRateLimiter={rateLimiter}
          rateLimitScopeKey={rateLimitScopeKey}
          onUnlockPassword={async (password) => {
            await unlockFromVaultPassword(password);
            router.push(afterUnlockPath);
          }}
          onUnlockRecoveryPhrase={async (phrase) => {
            await unlockFromRecoveryPhrase(phrase);
            router.push(afterUnlockPath);
          }}
          onUnlockPasskey={
            passkeyAvailability.showPasskey
              ? async () => {
                  await unlockFromPasskey(prefetchedOptions ?? undefined);
                  router.push(afterUnlockPath);
                }
              : undefined
          }
          renderError={(message) => (
            <Alert variant="danger" title="Unlock failed">
              {message}
            </Alert>
          )}
        />
      ) : (
        <LegacyVaultUnlockPanel
          loading={loading}
          error={error}
          vaultStatus={serverStatus}
          onUnlockPasskey={async () => {
            await unlockFromPasskey();
            router.push(afterUnlockPath);
          }}
          onUnlockRecovery={unlockFromRecoveryCode}
          afterUnlockPath={afterUnlockPath}
          onNavigateAfterUnlock={(path) => router.push(path)}
        />
      )}
    </PageLayout>
  );
}
