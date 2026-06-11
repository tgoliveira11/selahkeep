"use client";

import { useEffect, useState } from "react";
import { useVault } from "@/features/vault/use-vault";
import { vaultApi } from "@/lib/api-client/vault";
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
  const [vaultStatus, setVaultStatus] = useState<Awaited<ReturnType<typeof vaultApi.status>> | null>(
    null
  );
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    vaultApi.status().then(setVaultStatus).catch(() => setVaultStatus(null));
  }, []);

  const needsInit = vaultStatus?.initialized === false;
  const panelMode: VaultUnlockPanelMode = showRecovery
    ? "recovery"
    : needsInit
      ? "init"
      : "unlock";

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
    purpose === "write"
      ? needsInit
        ? "Set up your private vault"
        : "Unlock to write"
      : "Unlock to read this letter";

  const description = needsInit
    ? "Before your first letter is saved, we protect it on this device. Our team cannot read your private letters."
    : "Unlock your vault to continue on this browser.";

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
