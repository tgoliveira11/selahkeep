"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { useVault } from "@/features/vault/use-vault";
import { vaultApi } from "@/lib/api-client/vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { VaultUnlockPanel, type VaultUnlockPanelMode } from "@/features/vault/vault-unlock-panel";
import { Alert } from "@/components/ui/alert";
import {
  PASSKEY_LOGIN_OUTCOME_KEY,
  type PasskeyLoginOutcome,
} from "@/features/passkey/sign-in-with-passkey";
import {
  PASSKEY_LOGIN_PRF_UNAVAILABLE_MESSAGE,
  PASSKEY_LOGIN_VAULT_LOCKED_MESSAGE,
} from "@/lib/passkey/messages";

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
  } = useVault();
  const [vaultStatus, setVaultStatus] = useState<Awaited<ReturnType<typeof vaultApi.status>> | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [mode, setMode] = useState<VaultUnlockPanelMode | "loading">("loading");
  const [passkeyLoginNotice, setPasskeyLoginNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    if (isVaultUnlocked()) {
      router.push("/letters");
      return;
    }

    const outcome = sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY) as PasskeyLoginOutcome | null;
    if (outcome === "vault-locked") {
      setPasskeyLoginNotice(PASSKEY_LOGIN_VAULT_LOCKED_MESSAGE);
      sessionStorage.removeItem(PASSKEY_LOGIN_OUTCOME_KEY);
    } else if (outcome === "prf-unavailable") {
      setPasskeyLoginNotice(PASSKEY_LOGIN_PRF_UNAVAILABLE_MESSAGE);
      sessionStorage.removeItem(PASSKEY_LOGIN_OUTCOME_KEY);
    }

    vaultApi
      .status()
      .then((s) => {
        setVaultStatus(s);
        setMode(!s.initialized ? "init" : "unlock");
      })
      .catch(() => setMode("unlock"));
  }, [status, router]);

  async function handleInit() {
    await initializeVault();
    router.push("/letters");
  }

  async function handleUnlock() {
    try {
      await unlockFromDevice();
      router.push("/letters");
    } catch {
      setMode("recovery");
    }
  }

  async function handleRecovery() {
    await unlockFromRecoveryCode(recoveryCode);
    router.push("/letters");
  }

  async function handlePasskeyUnlock() {
    await unlockFromPasskey();
    router.push("/letters");
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
        title="Your private vault"
        description="Your letters stay protected on your device. Our team cannot read or unlock them for you."
      />
      {passkeyLoginNotice && (
        <Alert variant="muted" className="mb-6">
          You are signed in, but your private letters are still locked.
          <span className="mt-2 block">{passkeyLoginNotice}</span>
        </Alert>
      )}
      <VaultUnlockPanel
        mode={mode}
        loading={loading}
        error={error}
        offlineNotice={offlineNotice}
        vaultStatus={vaultStatus}
        recoveryCode={recoveryCode}
        onRecoveryCodeChange={setRecoveryCode}
        onInit={handleInit}
        onUnlockDevice={handleUnlock}
        onUnlockPasskey={handlePasskeyUnlock}
        onUnlockRecovery={handleRecovery}
        onShowRecovery={() => setMode("recovery")}
        onBackFromRecovery={() => setMode("unlock")}
      />
    </PageLayout>
  );
}
