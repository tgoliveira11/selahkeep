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

/**
 * Briefly suppress the global activity listener (NOT explicit touchVaultActivity).
 * Used around vault-dock open/close so merely checking the timer never resets it,
 * even for events that fire after the handle unmounts (e.g. the bubbled click).
 */
let activitySuppressedUntil = 0;
export function suppressVaultActivity(ms = 500): void {
  activitySuppressedUntil = Date.now() + ms;
}

/** Resets the vault inactivity timer while the vault is unlocked. */
export function useVaultActivity(): void {
  useEffect(() => {
    function onActivity(event: Event) {
      // Suppressed briefly around vault-dock toggles (covers events that fire
      // after the handle unmounts, like the bubbled click).
      if (Date.now() < activitySuppressedUntil) return;
      // Opening/closing or interacting with the vault dock must not count as
      // activity — otherwise just checking the timer would reset it. The
      // explicit "Stay unlocked" button still resets via touchVaultActivity().
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-vault-dock-ignore-activity]")
      ) {
        return;
      }
      // Focus reverting to the document body/root (e.g. when the dock handle
      // unmounts as the panel opens) is not real user activity.
      if (
        event.type === "focusin" &&
        (target === document.body || target === document.documentElement)
      ) {
        return;
      }
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
