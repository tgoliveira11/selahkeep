"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import {
  configureVaultAutoLock,
  subscribeVaultSession,
} from "@/lib/crypto-client/vault-session";
import { recordVaultSecurityEvent } from "@/features/vault/record-vault-security-event";

export const VAULT_INACTIVITY_LOCK_MESSAGE =
  "Your vault was locked to protect your private notes.";

export const VAULT_INACTIVITY_LOCK_WRITING_MESSAGE =
  "Your vault was locked to protect your private notes. Unsaved work may be saved as an encrypted draft on this device.";

function isWritingRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/notes/new" || /^\/notes\/[^/]+$/.test(pathname);
}

/** Shows a calm banner when the vault auto-locks after inactivity. */
export function VaultAutoLockNotice() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [writingContext, setWritingContext] = useState(false);

  useEffect(() => {
    configureVaultAutoLock(() => {
      setWritingContext(isWritingRoute(pathname));
      setVisible(true);
      void recordVaultSecurityEvent("vault_auto_locked");
    });

    const unsubscribe = subscribeVaultSession(() => {
      if (isVaultUnlocked()) {
        setVisible(false);
        setWritingContext(false);
      }
    });

    return () => {
      configureVaultAutoLock();
      unsubscribe();
    };
  }, [pathname]);

  if (!visible) return null;

  const message = writingContext
    ? VAULT_INACTIVITY_LOCK_WRITING_MESSAGE
    : VAULT_INACTIVITY_LOCK_MESSAGE;

  return (
    <div className="vault-auto-lock-notice" role="status" aria-live="polite">
      <Alert variant="info" title="Vault locked">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p>{message}</p>
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
