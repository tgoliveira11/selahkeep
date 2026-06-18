"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import {
  configureVaultAutoLock,
  subscribeVaultSession,
} from "@/lib/crypto-client/vault-session";
import { recordVaultSecurityEvent } from "@/features/vault/record-vault-security-event";

export const VAULT_INACTIVITY_LOCK_MESSAGE =
  "Your vault was locked to protect your private notes.";

/** Shows a calm banner when the vault auto-locks after inactivity. */
export function VaultAutoLockNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    configureVaultAutoLock(() => {
      setVisible(true);
      void recordVaultSecurityEvent("vault_auto_locked");
    });

    const unsubscribe = subscribeVaultSession(() => {
      if (isVaultUnlocked()) {
        setVisible(false);
      }
    });

    return () => {
      configureVaultAutoLock();
      unsubscribe();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="vault-auto-lock-notice" role="status" aria-live="polite">
      <Alert variant="info" title="Vault locked">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p>{VAULT_INACTIVITY_LOCK_MESSAGE}</p>
          <button
            type="button"
            className="shrink-0 text-sm font-medium underline underline-offset-2"
            onClick={() => setVisible(false)}
          >
            Dismiss
          </button>
        </div>
      </Alert>
    </div>
  );
}
