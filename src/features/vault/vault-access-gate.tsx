"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/features/vault/use-vault";
import { vaultApi } from "@/lib/api-client/vault";
import { isPasskeySupported } from "@/lib/crypto-client/passkey-vault";

interface VaultAccessGateProps {
  purpose: "read" | "write";
  onAccessGranted: () => void;
}

export function VaultAccessGate({ purpose, onAccessGranted }: VaultAccessGateProps) {
  const {
    loading,
    error,
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
  const showPasskeyUnlock =
    isPasskeySupported() && (vaultStatus?.hasPasskey ?? false);

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
    ? "Before your first letter is saved, we set up encryption on this device. Our team cannot read your letters."
    : "Your letters are protected on your device. Unlock your vault to continue on this browser.";

  return (
    <div className="max-w-md space-y-4 p-6 bg-white border border-[var(--border)] rounded-lg">
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p className="text-sm text-[var(--muted)]">{description}</p>

      {needsInit ? (
        <Button onClick={handleInit} disabled={loading} className="w-full">
          {loading ? "Setting up..." : "Set up my vault"}
        </Button>
      ) : showRecovery ? (
        <div className="space-y-3">
          <Input
            type="text"
            placeholder="recovery-code-words-here"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
          />
          <Button
            onClick={handleRecovery}
            disabled={loading || !recoveryCode}
            className="w-full"
          >
            {loading ? "Unlocking..." : "Unlock with recovery code"}
          </Button>
          <Button variant="secondary" onClick={() => setShowRecovery(false)} className="w-full">
            Back
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {showPasskeyUnlock && (
            <Button onClick={handlePasskeyUnlock} disabled={loading} className="w-full">
              {loading ? "Unlocking..." : "Unlock with passkey"}
            </Button>
          )}
          <Button
            onClick={handleUnlock}
            disabled={loading}
            variant={showPasskeyUnlock ? "secondary" : "default"}
            className="w-full"
          >
            {loading ? "Unlocking..." : "Unlock on this device"}
          </Button>
          <Button variant="secondary" onClick={() => setShowRecovery(true)} className="w-full">
            Use recovery code
          </Button>
        </div>
      )}

      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
    </div>
  );
}
