"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { vaultApi } from "@/lib/api-client/vault";
import { useLtgVaultSetup } from "@/features/vault/use-ltg-vault-setup";
import { VaultSetupWizard } from "@/features/vault/vault-setup-wizard";

export default function VaultSetupPage() {
  const { status } = useSession();
  const router = useRouter();
  const setup = useLtgVaultSetup();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    if (isVaultUnlocked()) {
      router.push("/notes");
      return;
    }

    vaultApi
      .status()
      .then((s) => {
        if (s.initialized && s.ltgSetupComplete) {
          router.push("/vault/unlock");
        }
      })
      .catch(() => undefined);
  }, [status, router]);

  async function handleComplete() {
    await setup.completeSetup();
    router.push("/notes");
  }

  if (status === "loading") {
    return (
      <PageLayout width="narrow">
        <LoadingState label="Loading" />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="narrow">
      <PageHeader
        title="LTG Vault setup"
        description="Create your private vault with a vault password and recovery phrase."
      />
      <VaultSetupWizard
        step={setup.step}
        loading={setup.loading}
        error={setup.error}
        vaultPassword={setup.vaultPassword}
        vaultPasswordConfirm={setup.vaultPasswordConfirm}
        recoveryPhrase={setup.recoveryPhrase}
        phraseConfirmation={setup.phraseConfirmation}
        onVaultPasswordChange={setup.setVaultPassword}
        onVaultPasswordConfirmChange={setup.setVaultPasswordConfirm}
        onPhraseConfirmationChange={setup.setPhraseConfirmation}
        onSetStep={setup.setStep}
        onGeneratePhrase={setup.generatePhrase}
        onComplete={handleComplete}
      />
    </PageLayout>
  );
}
