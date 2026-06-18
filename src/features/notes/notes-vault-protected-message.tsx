"use client";

import { VaultLockedState } from "@/features/vault/vault-locked-state";

/** Helpful locked-vault state for /notes — no decrypted note content. */
export function NotesVaultProtectedMessage() {
  return <VaultLockedState variant="notes-list" returnTo="/notes" />;
}
