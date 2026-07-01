"use client";

import { usePathname } from "next/navigation";
import { VaultProtectedShell } from "@/features/vault/vault-protected-shell";
import { isVaultUnprotectedPath } from "@/lib/vault/vault-unprotected-paths";

export function VaultLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skipVaultGate = isVaultUnprotectedPath(pathname);

  if (skipVaultGate) {
    return children;
  }

  return <VaultProtectedShell>{children}</VaultProtectedShell>;
}
