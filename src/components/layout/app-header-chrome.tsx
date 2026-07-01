"use client";

import { useSession } from "next-auth/react";
import { Nav } from "@/components/layout/nav";
import { isFullyAuthenticatedSession } from "@/lib/auth/session-state";
import { VaultLockOverlayExclude } from "@/features/vault/vault-protected-shell";
import { cn } from "@/lib/ui/cn";

/**
 * Sticky authenticated header chrome. Vault dock handle lives inside `Nav`.
 * Matches vault-core consumer-demo: the whole header sits inside
 * `VaultLockOverlayExclude` so the expanded dock stays above the lock overlay.
 */
export function AppHeaderChrome() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && isFullyAuthenticatedSession(session);

  if (signedIn) {
    return (
      <VaultLockOverlayExclude className="sticky top-0 overflow-visible">
        <Nav />
      </VaultLockOverlayExclude>
    );
  }

  return (
    <div className={cn("sticky top-0 z-40 shadow-[var(--shadow-sm)]")}>
      <Nav />
    </div>
  );
}
