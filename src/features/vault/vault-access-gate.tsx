"use client";

import { useEffect, useState } from "react";
import { useVault } from "@/features/vault/use-vault";
import { vaultApi } from "@/lib/api-client/vault";
import { deriveClientStatusFromServer } from "@/lib/vault/vault-status";
import { useVaultSessionUnlocked } from "@/features/vault/use-vault-session-unlocked";
import { VaultStatusPrompt } from "@/features/vault/vault-status-prompt";
import { VaultUnlockPanel, type VaultUnlockPanelMode } from "@/features/vault/vault-unlock-panel";

interface VaultAccessGateProps {
  purpose: "read" | "write";
  onAccessGranted: () => void;
}

export function VaultAccessGate({ purpose, onAccessGranted }: VaultAccessGateProps) {
  const {
    loading,
    error,
    offlineNotice,
    initializeVault,
    unlockFromDevice,
    unlockFromPasskey,
    unlockFromRecoveryCode,
  } = useVault();
  const vaultUnlocked = useVaultSessionUnlocked();
  const [vaultStatus, setVaultStatus] = useState<Awaited<ReturnType<typeof vaultApi.status>> | null>(
    null
  );
  const [statusLoading, setStatusLoading] = useState(true);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    let cancelled = false;

    vaultApi
      .status()
      .then((status) => {
        if (!cancelled) setVaultStatus(status);
      })
      .catch(() => {
        if (!cancelled) setVaultStatus(null);
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (statusLoading) {
    return null;
  }

  if (!vaultStatus) {
    return null;
  }

  const clientStatus = deriveClientStatusFromServer(vaultStatus, vaultUnlocked);

  if (clientStatus === "not_configured" || clientStatus === "setup_incomplete") {
    return <VaultStatusPrompt clientStatus={clientStatus} />;
  }

  if (clientStatus === "locked" && vaultStatus.setupPhase === "complete") {
    const panelMode: VaultUnlockPanelMode = showRecovery ? "recovery" : "unlock";

    async function handleInit() {
      await initializeVault();
      onAccessGranted();
    }

    async function handleUnlock() {
      try {
        await unlockFromDevice();
        onAccessGranted();
      } catch {
        setShowRecovery(true);
      }
    }

    async function handlePasskeyUnlock() {
      await unlockFromPasskey();
      onAccessGranted();
    }

    async function handleRecovery() {
      await unlockFromRecoveryCode(recoveryCode);
      onAccessGranted();
    }

    const heading =
      purpose === "write" ? "Unlock to write" : "Unlock to read your notes";

    const description = "Unlock your vault to continue on this browser.";

    return (
      <VaultUnlockPanel
        embedded
        mode={panelMode}
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
        onShowRecovery={() => setShowRecovery(true)}
        onBackFromRecovery={() => setShowRecovery(false)}
        heading={heading}
        description={description}
      />
    );
  }

  if (clientStatus === "locked") {
    return <VaultStatusPrompt clientStatus="locked" />;
  }

  return null;
}
