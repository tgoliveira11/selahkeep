"use client";

import { useVaultUnlocked } from "@tgoliveira/vault-core/react";

/** Bridge SelahKeep hooks to vault-core session unlock state. */
export function useVaultSessionUnlocked(): boolean {
  return useVaultUnlocked();
}
