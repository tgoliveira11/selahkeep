"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { clearVaultClientState, isVaultUnlocked } from "@/lib/crypto-client/vault";
import {
  isVaultManuallyLocked,
  lockVaultSession,
  subscribeVaultSession,
} from "@/lib/crypto-client/vault-session";

export function Nav() {
  const { data: session } = useSession();
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

  useEffect(() => {
    setVaultUnlocked(isVaultUnlocked() && !isVaultManuallyLocked());
    return subscribeVaultSession(() => {
      setVaultUnlocked(isVaultUnlocked() && !isVaultManuallyLocked());
    });
  }, [session?.user?.id]);

  function handleLockVault() {
    lockVaultSession();
    setVaultUnlocked(false);
  }

  async function handleSignOut() {
    const userId = session?.user?.id;
    if (userId) {
      try {
        lockVaultSession();
        await clearVaultClientState(userId);
      } catch {
        // Continue sign-out even if local cleanup fails.
      }
    }
    await signOut({ callbackUrl: `${window.location.origin}/` });
  }

  return (
    <nav className="border-b border-[var(--border)] bg-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-[var(--primary)]">
          Letters to God
        </Link>
        {session ? (
          <div className="flex items-center gap-4">
            <Link href="/letters" className="text-sm hover:underline">
              My Letters
            </Link>
            <Link href="/vault/devices" className="text-sm hover:underline">
              Devices
            </Link>
            <Link href="/vault/recovery" className="text-sm hover:underline">
              Recovery
            </Link>
            {vaultUnlocked && (
              <Button variant="secondary" onClick={handleLockVault}>
                Lock vault
              </Button>
            )}
            <Button variant="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
