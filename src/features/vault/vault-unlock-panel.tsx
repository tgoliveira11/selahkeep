"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { PrivacyNotice } from "@/components/ui/privacy-notice";
import { isPasskeySupported } from "@/lib/crypto-client/passkey-vault";
import { getRecoveryStateLabel } from "@/lib/ui/recovery-state-labels";
import type { VaultStatus } from "@/lib/api-client/vault";

export type VaultUnlockPanelMode = "init" | "unlock" | "recovery";

interface VaultUnlockPanelProps {
  mode: VaultUnlockPanelMode;
  loading: boolean;
  error: string | null;
  offlineNotice: string | null;
  vaultStatus: VaultStatus | null;
  recoveryCode: string;
  onRecoveryCodeChange: (value: string) => void;
  onInit: () => void;
  onUnlockDevice: () => void;
  onUnlockPasskey: () => void;
  onUnlockRecovery: () => void;
  onShowRecovery: () => void;
  onBackFromRecovery: () => void;
  heading?: string;
  description?: string;
  embedded?: boolean;
}

export function VaultUnlockPanel({
  mode,
  loading,
  error,
  offlineNotice,
  vaultStatus,
  recoveryCode,
  onRecoveryCodeChange,
  onInit,
  onUnlockDevice,
  onUnlockPasskey,
  onUnlockRecovery,
  onShowRecovery,
  onBackFromRecovery,
  heading,
  description,
  embedded,
}: VaultUnlockPanelProps) {
  const showPasskeyUnlock = isPasskeySupported() && (vaultStatus?.hasPasskey ?? false);
  const recoveryLabel = vaultStatus ? getRecoveryStateLabel(vaultStatus.recoveryState) : null;

  const title =
    heading ??
    (mode === "init"
      ? "Set up your private vault"
      : mode === "recovery"
        ? "Unlock with recovery code"
        : "Unlock your vault");

  const body =
    description ??
    (mode === "init"
      ? "Before your first letter is saved, we protect it on this device. Our team cannot read your private letters."
      : mode === "recovery"
        ? "Enter the recovery code you saved when you set up your account."
        : "Your letters are protected on this device. Unlock to continue on this browser.");

  const content = (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{body}</p>
      </div>

      {mode !== "init" && recoveryLabel && (
        <Alert
          variant={
            recoveryLabel.variant === "success"
              ? "success"
              : recoveryLabel.variant === "danger"
                ? "danger"
                : "warning"
          }
          title={`Recovery protection: ${recoveryLabel.label}`}
        >
          {recoveryLabel.description}
        </Alert>
      )}

      {mode === "init" && (
        <div className="space-y-3">
          <PrivacyNotice compact />
          <Button onClick={onInit} disabled={loading} className="w-full">
            {loading ? "Setting up…" : "Set up my vault"}
          </Button>
        </div>
      )}

      {mode === "unlock" && (
        <div className="space-y-3">
          {showPasskeyUnlock && (
            <Button onClick={onUnlockPasskey} disabled={loading} className="w-full">
              {loading ? "Unlocking…" : "Unlock with passkey"}
            </Button>
          )}
          <Button
            onClick={onUnlockDevice}
            disabled={loading}
            variant={showPasskeyUnlock ? "secondary" : "primary"}
            className="w-full"
          >
            {loading ? "Unlocking…" : "Unlock on this device"}
          </Button>
          <Button variant="secondary" onClick={onShowRecovery} className="w-full">
            Use recovery code
          </Button>
        </div>
      )}

      {mode === "recovery" && (
        <div className="space-y-3">
          {showPasskeyUnlock && (
            <Button onClick={onUnlockPasskey} disabled={loading} className="w-full">
              {loading ? "Unlocking…" : "Unlock with passkey"}
            </Button>
          )}
          <FormField
            id="vault-recovery-code"
            label="Recovery code"
            hint="Enter all words separated by spaces, exactly as you saved them."
          >
            <Input
              id="vault-recovery-code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={recoveryCode}
              onChange={(e) => onRecoveryCodeChange(e.target.value)}
            />
          </FormField>
          <Button
            onClick={onUnlockRecovery}
            disabled={loading || !recoveryCode.trim()}
            className="w-full"
          >
            {loading ? "Unlocking…" : "Unlock with recovery code"}
          </Button>
          <Button variant="secondary" onClick={onBackFromRecovery} className="w-full">
            Back
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      {offlineNotice && !error && (
        <Alert variant="muted">{offlineNotice}</Alert>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <Card>{content}</Card>;
}
