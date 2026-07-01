"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { VaultStatus } from "@/lib/api-client/vault";

interface LegacyVaultUnlockPanelProps {
  loading: boolean;
  error: string | null;
  vaultStatus: VaultStatus;
  recoveryCode?: string;
  onRecoveryCodeChange?: (value: string) => void;
  onUnlockPasskey: () => void | Promise<void>;
  onUnlockRecovery: (code: string) => void | Promise<void>;
  afterUnlockPath: string;
  onNavigateAfterUnlock: (path: string) => void;
}

/** Legacy vault-v1 unlock UI (recovery code + passkey). vault-v2 uses vault-core VaultUnlockPanel. */
export function LegacyVaultUnlockPanel({
  loading,
  error,
  onUnlockPasskey,
  onUnlockRecovery,
  afterUnlockPath,
  onNavigateAfterUnlock,
}: LegacyVaultUnlockPanelProps) {
  const [legacyRecoveryCode, setLegacyRecoveryCode] = useState("");

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Unlock your vault</h2>
        <p className="text-sm text-[var(--muted)]">
          Use your recovery code or passkey to unlock your legacy vault.
        </p>
      </div>
      {error ? (
        <Alert variant="danger" title="Unlock failed">
          {error}
        </Alert>
      ) : null}
      <FormField id="legacy-recovery-code" label="Recovery code">
        <Input
          id="legacy-recovery-code"
          value={legacyRecoveryCode}
          onChange={(event) => setLegacyRecoveryCode(event.target.value)}
          autoComplete="off"
        />
      </FormField>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="flex-1"
          disabled={loading || !legacyRecoveryCode.trim()}
          onClick={async () => {
            await onUnlockRecovery(legacyRecoveryCode);
            onNavigateAfterUnlock(afterUnlockPath);
          }}
        >
          Unlock with recovery code
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={loading}
          onClick={async () => {
            await onUnlockPasskey();
            onNavigateAfterUnlock(afterUnlockPath);
          }}
        >
          Unlock with passkey
        </Button>
      </div>
    </Card>
  );
}
