"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVault } from "@/features/vault/use-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { VaultStatusPrompt } from "@/features/vault/vault-status-prompt";
import { LtgVaultUnlockPanel } from "@/features/vault/ltg-vault-unlock-panel";
import { VaultUnlockPanel } from "@/features/vault/vault-unlock-panel";
import { getVaultStatusCopy } from "@/lib/vault/vault-status";
import { PRODUCT_NAME } from "@/lib/marketing/brand";

export default function VaultUnlockPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const vaultClient = useVaultClientStatus();
  const {
    loading,
    error,
    unlockFromPasskey,
    unlockFromRecoveryCode,
    unlockFromVaultPassword,
    unlockFromRecoveryPhrase,
  } = useVault();
  const [legacyRecoveryCode, setLegacyRecoveryCode] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

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

  if (clientStatus === "unlocked") {
    const copy = getVaultStatusCopy("unlocked", "unlock");
    return (
      <PageLayout width="narrow">
        <PageHeader title={PRODUCT_NAME} description="Your private notes stay encrypted. Only you can unlock them." />
        <Card className="space-y-4 p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{copy.promptTitle}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{copy.promptDescription}</p>
          </div>
          <Link href="/notes">
            <Button className="w-full sm:w-auto">{copy.promptCta}</Button>
          </Link>
        </Card>
      </PageLayout>
    );
  }

  if (clientStatus === "not_configured" || clientStatus === "setup_incomplete") {
    return (
      <PageLayout width="narrow">
        <PageHeader title={PRODUCT_NAME} description="Your private notes stay encrypted. Only you can unlock them." />
        <VaultStatusPrompt clientStatus={clientStatus} context="unlock" />
      </PageLayout>
    );
  }

  const showLtgUnlock = serverStatus.setupComplete && serverStatus.vaultVersion === "vault-v2";
  const legacyMode = !showLtgUnlock ? "legacy-unlock" : null;

  return (
    <PageLayout width="narrow">
      <PageHeader
        title={PRODUCT_NAME}
        description="Your private notes stay encrypted. Only you can unlock them."
      />
      {showLtgUnlock && (
        <LtgVaultUnlockPanel
          loading={loading}
          error={error}
          vaultStatus={serverStatus}
          onUnlockPassword={async (password) => {
            await unlockFromVaultPassword(password);
            router.push("/notes");
          }}
          onUnlockRecoveryPhrase={async (phrase) => {
            await unlockFromRecoveryPhrase(phrase);
            router.push("/notes");
          }}
          onUnlockPasskey={async () => {
            await unlockFromPasskey();
            router.push("/notes");
          }}
          onUnlockLegacyPasskey={async () => {
            await unlockFromPasskey();
            router.push("/notes");
          }}
          onUnlockLegacyRecoveryCode={async (code) => {
            await unlockFromRecoveryCode(code);
            router.push("/notes");
          }}
        />
      )}
      {legacyMode && (
        <VaultUnlockPanel
          mode="unlock"
          loading={loading}
          error={error}
          vaultStatus={serverStatus}
          recoveryCode={legacyRecoveryCode}
          onRecoveryCodeChange={setLegacyRecoveryCode}
          onUnlockPasskey={async () => {
            await unlockFromPasskey();
            router.push("/notes");
          }}
          onUnlockRecovery={async () => {
            await unlockFromRecoveryCode(legacyRecoveryCode);
            router.push("/notes");
          }}
          onShowRecovery={() => undefined}
          onBackFromRecovery={() => undefined}
          heading="Unlock your vault"
          description="Use your recovery code, recovery phrase, or passkey to unlock."
        />
      )}
    </PageLayout>
  );
}
