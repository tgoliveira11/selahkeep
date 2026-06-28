"use client";

import { useEffect } from "react";
import { suspendVaultAutoLock } from "@/lib/crypto-client/vault-session";

/** Pauses vault inactivity auto-lock while `active` is true (nested-safe). */
export function useSuspendVaultAutoLockWhile(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return suspendVaultAutoLock();
  }, [active]);
}
