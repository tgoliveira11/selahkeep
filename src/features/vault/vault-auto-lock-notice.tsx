"use client";

/** Vault auto-lock banner disabled — vault status is shown in the header dock only. */
export function VaultAutoLockNotice() {
  return null;
}

export const VAULT_INACTIVITY_LOCK_MESSAGE =
  "Your vault was locked to protect your private notes.";

export const VAULT_INACTIVITY_LOCK_WRITING_MESSAGE =
  "Your vault was locked to protect your private notes. Unsaved work may be saved as an encrypted draft on this device.";
