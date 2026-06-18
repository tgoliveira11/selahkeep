"use client";

import { useEffect } from "react";
import { touchVaultSession } from "@/lib/crypto-client/vault-session";

const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "input",
  "focusin",
  "scroll",
  "pointerdown",
  "touchstart",
] as const;

/** Resets the vault inactivity timer while the vault is unlocked. */
export function useVaultActivity(): void {
  useEffect(() => {
    function onActivity() {
      touchVaultSession();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, []);
}
