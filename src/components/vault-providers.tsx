"use client";

import type { ReactNode } from "react";
import { VaultSessionProvider } from "@tgoliveira/vault-core/react";
import { configureSelahkeepVaultSession } from "@/lib/crypto-client/vault-session";
import { getVaultAutoLockMinutesFromConfig } from "@/lib/env/vault-from-env";
import {
  readUserVaultAutoLockMinutes,
  resolveVaultAutoLockMinutesPreference,
} from "@tgoliveira/vault-core/browser";

configureSelahkeepVaultSession();

export function VaultProviders({ children }: { children: ReactNode }) {
  const adminMinutes = getVaultAutoLockMinutesFromConfig();

  return (
    <VaultSessionProvider
      sessionConfig={{
        autoLockMinutes: adminMinutes,
        resolveAutoLockMinutes: () =>
          resolveVaultAutoLockMinutesPreference({
            adminMinutes,
            userMinutes: readUserVaultAutoLockMinutes(),
          }),
      }}
      registerUnloadGuard
      registerActivityGuard={false}
    >
      {children}
    </VaultSessionProvider>
  );
}
