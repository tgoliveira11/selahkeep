"use client";

import { useRouter } from "next/navigation";
import {
  VaultLockOverlayExclude,
  VaultProtectedGate,
  VaultSensitiveRegion,
  requestVaultDockExpand,
} from "@tgoliveira/vault-core/react";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";

export function VaultProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const vaultClient = useVaultClientStatus();

  const configured =
    vaultClient.status === "ready"
      ? vaultClient.clientStatus !== "not_configured" &&
        vaultClient.clientStatus !== "setup_incomplete"
      : null;

  return (
    <VaultProtectedGate
      configured={configured}
      redirectToSetup="/vault/setup"
      onRedirectToSetup={(path) => router.replace(path)}
      onExpandDock={() => requestVaultDockExpand()}
      overlayBackground="color-mix(in srgb, var(--background) 92%, transparent)"
      loadingFallback={null}
    >
      <VaultSensitiveRegion>{children}</VaultSensitiveRegion>
    </VaultProtectedGate>
  );
}

export { VaultLockOverlayExclude };
