"use client";

import { VaultLockedState } from "@/features/vault/vault-locked-state";

const LOGGED_IN_HOME_PATH = "/home";

export function LoggedInHomeLockedHero() {
  return <VaultLockedState variant="notes-list" returnTo={LOGGED_IN_HOME_PATH} embedded />;
}
