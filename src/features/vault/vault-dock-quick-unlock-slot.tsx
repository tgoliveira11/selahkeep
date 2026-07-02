"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { VaultDockQuickUnlock } from "@tgoliveira/vault-core/react";
import type { VaultServerStatusSnapshot } from "@tgoliveira/vault-core/react";
import { Alert } from "@/components/ui/alert";
import { getVaultUnlockRateLimiter } from "@/lib/vault/vault-rate-limit";

type VaultUnlockRateLimiter = ReturnType<typeof getVaultUnlockRateLimiter>;

interface VaultDockQuickUnlockSlotProps {
  loading: boolean;
  error: string | null;
  serverStatus: VaultServerStatusSnapshot;
  passkeyReady: boolean;
  unlockRateLimiter: VaultUnlockRateLimiter;
  rateLimitScopeKey: string;
  refreshPasskeyOptions: () => Promise<PublicKeyCredentialRequestOptionsJSON | null>;
  onUnlockPassword: (password: string) => Promise<void>;
  onUnlockPasskey: (options: PublicKeyCredentialRequestOptionsJSON | null) => Promise<void>;
  onPasskeyUnlockFailed: (error: unknown) => void;
  onPasskeyUnlockCancelled: (error: unknown) => void;
  bindAutoStartPasskey: (handler: (() => void) | null) => void;
}

/**
 * Renders only while the dock quick-unlock panel is expanded. Refreshes WebAuthn
 * options on each mount (expand) before allowing vault-core passkey auto-start.
 */
export function VaultDockQuickUnlockSlot({
  loading,
  error,
  serverStatus,
  passkeyReady,
  unlockRateLimiter,
  rateLimitScopeKey,
  refreshPasskeyOptions,
  onUnlockPassword,
  onUnlockPasskey,
  onPasskeyUnlockFailed,
  onPasskeyUnlockCancelled,
  bindAutoStartPasskey,
}: VaultDockQuickUnlockSlotProps) {
  const [passkeyOptionsReady, setPasskeyOptionsReady] = useState(false);
  const latestOptionsRef = useRef<PublicKeyCredentialRequestOptionsJSON | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPasskeyOptionsReady(false);
    latestOptionsRef.current = null;

    void refreshPasskeyOptions().then((options) => {
      if (cancelled) return;
      latestOptionsRef.current = options;
      setPasskeyOptionsReady(options != null);
    });

    return () => {
      cancelled = true;
      setPasskeyOptionsReady(false);
      latestOptionsRef.current = null;
    };
  }, [refreshPasskeyOptions]);

  return (
    <VaultDockQuickUnlock
      loading={loading}
      error={error}
      serverStatus={serverStatus}
      passkeyReady={passkeyReady}
      passkeyOptionsReady={passkeyOptionsReady}
      unlockRateLimiter={unlockRateLimiter}
      rateLimitScopeKey={rateLimitScopeKey}
      bindAutoStartPasskey={bindAutoStartPasskey}
      onPasskeyUnlockFailed={onPasskeyUnlockFailed}
      onPasskeyUnlockCancelled={onPasskeyUnlockCancelled}
      onUnlockPassword={onUnlockPassword}
      onUnlockPasskey={() => onUnlockPasskey(latestOptionsRef.current)}
      renderError={(message) => (
        <Alert variant="danger" title="Unlock failed">
          {message}
        </Alert>
      )}
    />
  );
}
