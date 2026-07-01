"use client";

import { touchVaultSession } from "@/lib/crypto-client/vault-session";

/** Explicit activity signal for editors and form controls. */
export function touchVaultActivity(): void {
  touchVaultSession();
}

/** @deprecated Activity-based auto-lock renewal is off by default in vault-core 1.0.0. */
export function suppressVaultActivity(_ms = 500): void {
  // No-op — vault-core dock uses suppressVaultActivity from browser entry when needed.
}

/** @deprecated Removed — vault-core session does not register activity guards by default. */
export function useVaultActivity(): void {
  // Intentionally empty.
}
