"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Alert } from "@/components/ui/alert";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { VaultStatusPrompt } from "@/features/vault/vault-status-prompt";
import { RecoveryPhraseReplace } from "@/features/recovery/recovery-phrase-replace";
import { getRecoveryStateLabel } from "@/modules/vault/lib/recovery-state-labels";

export default function RecoveryPage() {
  const vault = useRequireVault();
  const vaultClient = useVaultClientStatus();
  const userId = vault.status === "ready" ? vault.userId : null;
  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const serverStatus =
    vaultClient.status === "ready" ? vaultClient.serverStatus : null;

  if (
    vault.status === "loading" ||
    vault.status === "redirecting" ||
    vaultClient.status === "loading"
  ) {
    return (
      <PageLayout width="medium">
        <LoadingState label="Loading recovery options" />
      </PageLayout>
    );
  }

  if (vault.status === "error" || vaultClient.status === "error") {
    return (
      <PageLayout width="medium">
        <ErrorState
          message={
            vault.status === "error"
              ? vault.message
              : vaultClient.status === "error"
                ? vaultClient.message
                : "Failed to load recovery options"
          }
        />
      </PageLayout>
    );
  }

  if (clientStatus && clientStatus !== "unlocked") {
    return (
      <PageLayout width="medium">
        <PageHeader
          title="Recovery options"
          description="Manage ways to unlock your vault on a new device."
        />
        <VaultStatusPrompt
          clientStatus={clientStatus}
          context="recovery"
          returnTo="/vault/recovery"
        />
      </PageLayout>
    );
  }

  const recoveryState = getRecoveryStateLabel(serverStatus?.recoveryState);
  const recoveryPhrase = serverStatus?.recoveryPhrase;
  const hasLegacyRecoveryCode = serverStatus?.hasRecoveryCode ?? false;

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Recovery options"
        description="Manage your recovery phrase — the primary way to restore vault access on a new device."
      />

      <div className="space-y-8">
        {recoveryState && (
          <Alert variant={recoveryState.variant} title={recoveryState.label}>
            {recoveryState.description}
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recovery phrase</CardTitle>
            <CardDescription>
              Your recovery phrase restores vault access if you forget your vault password. It is
              created during vault setup and never leaves this device.
            </CardDescription>
          </CardHeader>

          {recoveryPhrase ? (
            <RecoveryPhraseReplace
              recoveryPhrase={recoveryPhrase}
              onReplaced={() => vaultClient.recheck()}
            />
          ) : (
            <Alert variant="warning" title="Recovery phrase missing">
              Your vault is missing a recovery phrase envelope. Complete vault setup again or contact
              support if this looks wrong.
            </Alert>
          )}
        </Card>

        {hasLegacyRecoveryCode && (
          <Card>
            <CardHeader>
              <CardTitle>Legacy recovery code</CardTitle>
              <CardDescription>
                This vault still has an older recovery code envelope from before SelahKeep used
                recovery phrases. You can still unlock with that code on the unlock screen. New
                recovery codes cannot be generated here.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {userId && (
          <p className="text-sm text-[var(--muted)]">
            Optional: configure{" "}
            <Link href="/vault/settings" className="text-[var(--primary)] underline">
              passkey vault unlock
            </Link>{" "}
            in vault settings (separate from account passkey sign-in).
          </p>
        )}
      </div>
    </PageLayout>
  );
}
