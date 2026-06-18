"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const LEAVE_TITLE = "Leave without saving?";
const LEAVE_DESCRIPTION = "Your changes have not been saved yet.";

export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty || typeof window === "undefined") return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

export function useConfirmLeave(dirty: boolean) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestLeave = useCallback(
    (action: () => void) => {
      if (!dirty) {
        action();
        return;
      }
      setPendingAction(() => action);
    },
    [dirty]
  );

  const confirmDialog = (
    <ConfirmDialog
      open={pendingAction !== null}
      title={LEAVE_TITLE}
      description={LEAVE_DESCRIPTION}
      confirmLabel="Leave without saving"
      cancelLabel="Keep editing"
      onConfirm={() => {
        const action = pendingAction;
        setPendingAction(null);
        action?.();
      }}
      onCancel={() => setPendingAction(null)}
    />
  );

  return { requestLeave, confirmDialog };
}

export function useAutosaveTimer(
  enabled: boolean,
  save: () => void | Promise<void>,
  delayMs = 1500
) {
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      void save();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [enabled, delayMs, save]);
}
