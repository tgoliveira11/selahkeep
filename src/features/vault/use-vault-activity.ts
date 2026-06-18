"use client";

import { useEffect } from "react";
import { touchVaultSession } from "@/lib/crypto-client/vault-session";

const WINDOW_ACTIVITY_EVENTS = ["click", "focusin", "scroll", "touchstart"] as const;

const CAPTURE_ACTIVITY_EVENTS = [
  "keydown",
  "input",
  "pointerdown",
  "compositionstart",
  "compositionend",
  "paste",
] as const;

/** Explicit activity signal for editors and form controls that may not bubble to window. */
export function touchVaultActivity(): void {
  touchVaultSession();
}

/** Resets the vault inactivity timer while the vault is unlocked. */
export function useVaultActivity(): void {
  useEffect(() => {
    function onActivity() {
      touchVaultSession();
    }

    for (const event of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    for (const event of CAPTURE_ACTIVITY_EVENTS) {
      document.addEventListener(event, onActivity, { capture: true, passive: true });
    }

    return () => {
      for (const event of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      for (const event of CAPTURE_ACTIVITY_EVENTS) {
        document.removeEventListener(event, onActivity, { capture: true });
      }
    };
  }, []);
}
