"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { useVault } from "@/features/vault/use-vault";
import { vaultApi, type VaultStatus } from "@/lib/api-client/vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { LtgVaultUnlockPanel } from "@/features/vault/ltg-vault-unlock-panel";
import { VaultUnlockPanel } from "@/features/vault/vault-unlock-panel";

export default function VaultUnlockPage() {
  const { status } = useSession();
  const router = useRouter();
  const {
    loading,
    error,
    offlineNotice,
    initializeVault,
    unlockFromDevice,
    unlockFromPasskey,
    unlockFromRecoveryCode,
    unlockFromVaultPassword,
    unlockFromRecoveryPhrase,
  } = useVault();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [legacyRecoveryCode, setLegacyRecoveryCode] = useState("");
  const [mode, setMode] = useState<"loading" | "ltg" | "legacy-init" | "legacy-unlock">("loading");

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
        setVaultStatus(s);
        if (!s.initialized) {
          router.push("/vault/setup");
          return;
        }
        if (s.ltgSetupComplete) {
          setMode("ltg");
        } else {
          setMode(s.vaultVersion === "vault-v1" ? "legacy-unlock" : "legacy-init");
        }
      })
      .catch(() => setMode("legacy-unlock"));
  }, [status, router]);

  async function handleLegacyInit() {
    await initializeVault();
    router.push("/notes");
  }

  if (status === "loading" || mode === "loading") {
    return (
      <PageLayout width="narrow">
        <LoadingState label="Loading your vault" />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="narrow">
      <PageHeader
        title="LTG Vault"
        description="Your private notes stay encrypted. Only you can unlock them."
      />
      {mode === "ltg" && (
        <LtgVaultUnlockPanel
          loading={loading}
          error={error}
          vaultStatus={vaultStatus}
          onUnlockPassword={async (password) => {
            await unlockFromVaultPassword(password);
            router.push("/notes");
          }}
          onUnlockRecoveryPhrase={async (phrase) => {
            await unlockFromRecoveryPhrase(phrase);
            router.push("/notes");
          }}
          onUnlockLegacyDevice={async () => {
            await unlockFromDevice();
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
      {(mode === "legacy-init" || mode === "legacy-unlock") && (
        <VaultUnlockPanel
          mode={mode === "legacy-init" ? "init" : "unlock"}
          loading={loading}
          error={error}
          offlineNotice={offlineNotice}
          vaultStatus={vaultStatus}
          recoveryCode={legacyRecoveryCode}
          onRecoveryCodeChange={setLegacyRecoveryCode}
          onInit={handleLegacyInit}
          onUnlockDevice={async () => {
            await unlockFromDevice();
            router.push("/notes");
          }}
          onUnlockPasskey={async () => {
            await unlockFromPasskey();
            router.push("/notes");
          }}
          onUnlockRecovery={async () => {
            await unlockFromRecoveryCode(legacyRecoveryCode);
            router.push("/notes");
          }}
          onShowRecovery={() => setMode("legacy-unlock")}
          onBackFromRecovery={() => setMode("legacy-unlock")}
          heading="Unlock your vault"
          description="Legacy vault setup — trusted device or recovery code."
        />
      )}
    </PageLayout>
  );
}
