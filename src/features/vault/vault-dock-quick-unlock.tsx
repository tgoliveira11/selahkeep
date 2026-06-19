"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { mapVaultUnlockError } from "@/features/vault/vault-unlock-errors";
import { useVaultDockPasskeyAvailable } from "@/features/vault/use-vault-dock-passkey-available";
import type { VaultStatus } from "@/lib/api-client/vault";

interface VaultDockQuickUnlockProps {
  loading: boolean;
  error: string | null;
  vaultStatus: VaultStatus | null;
  idPrefix?: string;
  onUnlockPassword: (password: string) => void | Promise<void>;
  onUnlockPasskey?: () => void | Promise<void>;
}

/** Compact dock unlock: one primary method — passkey when configured, otherwise vault password. */
export function VaultDockQuickUnlock({
  loading,
  error,
  vaultStatus,
  idPrefix = "dock-unlock",
  onUnlockPassword,
  onUnlockPasskey,
}: VaultDockQuickUnlockProps) {
  const [vaultPassword, setVaultPassword] = useState("");
  const { hasEnvelope, showPasskey, prfExplicitlyUnsupported } =
    useVaultDockPasskeyAvailable(vaultStatus);
  const displayError = mapVaultUnlockError(error);
  const passwordId = `${idPrefix}-vault-password`;
  const usePasskeyPrimary = hasEnvelope;

  async function submitPassword() {
    try {
      await onUnlockPassword(vaultPassword);
      setVaultPassword("");
    } catch {
      // Error surfaced via error prop.
    }
  }

  async function submitPasskey() {
    if (!onUnlockPasskey) return;
    try {
      await onUnlockPasskey();
    } catch {
      // Error surfaced via error prop.
    }
  }

  if (usePasskeyPrimary) {
    if (!showPasskey || !onUnlockPasskey) {
      return (
        <div className="vault-dock-unlock space-y-2.5">
          <p className="vault-dock-unlock__note text-xs text-[var(--muted)]">
            Passkey unlock is unavailable in this browser.
          </p>
          {displayError && (
            <Alert variant="danger" role="alert">
              {displayError}
            </Alert>
          )}
        </div>
      );
    }

    return (
      <div className="vault-dock-unlock space-y-2.5">
        <Button
          className="w-full text-sm"
          disabled={loading}
          onClick={submitPasskey}
        >
          {loading ? "Unlocking…" : "Unlock with passkey"}
        </Button>
        {prfExplicitlyUnsupported && (
          <p className="vault-dock-unlock__note text-xs text-[var(--muted)]">
            Passkey unlock is unavailable in this browser.
          </p>
        )}
        {displayError && (
          <Alert variant="danger" role="alert">
            {displayError}
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="vault-dock-unlock space-y-2.5">
      <FormField label="Vault password" id={passwordId}>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          value={vaultPassword}
          onChange={(e) => setVaultPassword(e.target.value)}
        />
      </FormField>
      <Button
        className="w-full text-sm"
        disabled={loading || !vaultPassword}
        onClick={submitPassword}
      >
        {loading ? "Unlocking…" : "Unlock vault"}
      </Button>
      {displayError && (
        <Alert variant="danger" role="alert">
          {displayError}
        </Alert>
      )}
    </div>
  );
}
