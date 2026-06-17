"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { configureVaultAutoLock } from "@/lib/crypto-client/vault-session";

export const VAULT_INACTIVITY_LOCK_MESSAGE =
  "Your vault was locked to protect your private notes.";

/** Shows a calm banner when the vault auto-locks after inactivity. */
export function VaultAutoLockNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    configureVaultAutoLock(() => setVisible(true));
    return () => configureVaultAutoLock();
  }, []);

  if (!visible) return null;

  return (
    <div className="vault-auto-lock-notice" role="status" aria-live="polite">
      <Alert variant="info" title="Vault locked">
        {VAULT_INACTIVITY_LOCK_MESSAGE}
      </Alert>
    </div>
  );
}
