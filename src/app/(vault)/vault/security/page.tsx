"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { VaultStatusPrompt } from "@/features/vault/vault-status-prompt";
import { VaultSecurityReview } from "@/features/vault/vault-security-review";
import { buildVaultUnlockHref } from "@/lib/notes/safe-return-to";
import { requestVaultDockExpand } from "@/features/vault/vault-status-dock-events";
import { PRODUCT_NAME } from "@/lib/marketing/brand";

export default function VaultSecurityPage() {
  const vault = useRequireVault();
  const vaultClient = useVaultClientStatus();
  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const serverStatus =
    vaultClient.status === "ready" ? vaultClient.serverStatus : null;

  if (vault.status === "loading" || vault.status === "redirecting" || vaultClient.status === "loading") {
    return (
      <PageLayout>
        <LoadingState label="Loading vault security" />
      </PageLayout>
    );
  }

  if (vault.status === "error" || vaultClient.status === "error") {
    return (
      <PageLayout>
        <ErrorState
          message={
            vault.status === "error"
              ? vault.message
              : vaultClient.status === "error"
                ? vaultClient.message
                : "Failed to load vault security"
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Vault security"
        description={`Review how your private notes are protected. ${PRODUCT_NAME} separates account sign-in from vault unlock. Your private notes remain encrypted until your vault is opened on this device.`}
      />

      {clientStatus === "unlocked" && serverStatus ? (
        <VaultSecurityReview serverStatus={serverStatus} />
      ) : clientStatus && clientStatus !== "unlocked" ? (
        <div className="space-y-4">
          {clientStatus === "locked" && serverStatus?.setupComplete && (
            <Card className="space-y-3 border-dashed p-5">
              <h2 className="font-medium">Protection overview (vault closed)</h2>
              <p className="text-sm text-[var(--muted)]">
                Some security checks are available while your vault is closed. Unlock your vault to run
                the recovery phrase test and view the full review.
              </p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted)]">Vault password</dt>
                  <dd className="font-medium">
                    {serverStatus.hasVaultPassword ? "Configured" : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Recovery phrase</dt>
                  <dd className="font-medium">
                    {serverStatus.hasRecoveryPhrase ? "Configured" : "Unknown"}
                  </dd>
                </div>
              </dl>
            </Card>
          )}
          {clientStatus === "locked" ? (
            <Card className="space-y-4 p-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Unlock your vault to run security checks</h2>
                <p className="text-sm text-[var(--muted)]">
                  Your account is signed in, but your vault remains closed until you unlock it.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button className="w-full sm:w-auto" onClick={() => requestVaultDockExpand()}>
                  Unlock vault
                </Button>
                <Link href={buildVaultUnlockHref("/vault/security")}>
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Open full unlock page
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <VaultStatusPrompt
              clientStatus={clientStatus}
              context="security"
              returnTo="/vault/security"
            />
          )}
        </div>
      ) : null}
    </PageLayout>
  );
}
