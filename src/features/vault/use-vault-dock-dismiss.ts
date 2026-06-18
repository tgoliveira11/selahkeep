"use client";

import { useEffect, type RefObject } from "react";

type VaultDockDismissOptions = {
  panelRef: RefObject<HTMLElement | null>;
  handleRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  shouldPreventDismiss: () => boolean;
  onDismiss: () => void;
};

/** Collapse expanded vault dock on outside click, Escape, or focus leaving the panel. */
export function useVaultDockDismiss({
  panelRef,
  handleRef,
  enabled,
  shouldPreventDismiss,
  onDismiss,
}: VaultDockDismissOptions): void {
  useEffect(() => {
    if (!enabled) return;

    function containsTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Node)) return false;
      const panel = panelRef.current;
      const handle = handleRef.current;
      return Boolean(panel?.contains(target) || handle?.contains(target));
    }

    function onPointerDown(event: MouseEvent) {
      if (shouldPreventDismiss()) return;
      if (!containsTarget(event.target)) {
        onDismiss();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !shouldPreventDismiss()) {
        onDismiss();
      }
    }

    let focusTimer: ReturnType<typeof setTimeout> | undefined;

    function onFocusOut() {
      if (shouldPreventDismiss()) return;
      focusTimer = setTimeout(() => {
        if (!containsTarget(document.activeElement)) {
          onDismiss();
        }
      }, 150);
    }

    function onFocusIn() {
      if (focusTimer) {
        clearTimeout(focusTimer);
        focusTimer = undefined;
      }
    }

    const panel = panelRef.current;
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    panel?.addEventListener("focusout", onFocusOut);
    panel?.addEventListener("focusin", onFocusIn);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      panel?.removeEventListener("focusout", onFocusOut);
      panel?.removeEventListener("focusin", onFocusIn);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [enabled, handleRef, onDismiss, panelRef, shouldPreventDismiss]);
}
