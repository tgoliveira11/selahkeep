"use client";

import { useEffect, useRef } from "react";
import { registerVaultBeforeAutoLock } from "@/lib/crypto-client/vault-session";

/** Saves encrypted note draft before vault auto-lock when the form is dirty. */
export function useNoteVaultBeforeAutoLock(
  dirty: boolean,
  persistDraft: () => void | Promise<void>
): void {
  const dirtyRef = useRef(dirty);
  const persistRef = useRef(persistDraft);

  useEffect(() => {
    dirtyRef.current = dirty;
    persistRef.current = persistDraft;
  }, [dirty, persistDraft]);

  useEffect(() => {
    return registerVaultBeforeAutoLock(async () => {
      if (dirtyRef.current) {
        await persistRef.current();
      }
    });
  }, []);
}
