"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutAccount } from "@/lib/auth/sign-out-client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppMark } from "@/components/ui/app-mark";
import { clearVaultClientState } from "@/lib/crypto-client/vault";
import { lockVaultSession } from "@/lib/crypto-client/vault-session";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { getVaultStatusCopy } from "@/lib/vault/vault-status";
import {
  isLoggedInNavLinkActive,
  LOGGED_IN_NAV_LINKS,
} from "@/lib/navigation/logged-in-nav";
import { cn } from "@/lib/ui/cn";
import { PRODUCT_NAME } from "@/lib/marketing/brand";

export function Nav() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const vaultClient = useVaultClientStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  const clientStatus = vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const vaultCopy = clientStatus ? getVaultStatusCopy(clientStatus) : null;
  const showVaultAction = clientStatus && clientStatus !== "unlocked";
  const showLockVault = clientStatus === "unlocked";

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLockVault() {
    lockVaultSession();
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
    await signOutAccount();
    router.push("/");
  }

  function badgeVariant(): "success" | "info" | "muted" {
    if (!clientStatus) return "muted";
    if (clientStatus === "unlocked") return "success";
    if (clientStatus === "locked") return "info";
    return "muted";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={session ? "/notes" : "/"}
          className="flex items-center gap-2 text-lg font-semibold text-[var(--primary)]"
        >
          <AppMark size={28} />
          <span>{PRODUCT_NAME}</span>
        </Link>

        {session ? (
          <>
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-1 md:flex"
            >
              {LOGGED_IN_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-[var(--radius)] px-3 py-2 text-sm transition-colors hover:bg-[var(--card-muted)]",
                    isLoggedInNavLinkActive(pathname, link.href)
                      ? "font-medium text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {showVaultAction && vaultCopy && (
                <Link
                  href={vaultCopy.actionHref}
                  className="rounded-[var(--radius)] px-3 py-2 text-sm font-medium text-[var(--warning)] hover:bg-[var(--card-muted)]"
                >
                  {vaultCopy.actionLabel}
                </Link>
              )}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {showLockVault && (
                <Button variant="secondary" onClick={handleLockVault}>
                  Lock vault
                </Button>
              )}
              <Button variant="secondary" onClick={handleSignOut}>
                Sign out
              </Button>
              {vaultCopy && (
                <Badge variant={badgeVariant()}>{vaultCopy.badgeLabel}</Badge>
              )}
            </div>

            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-3 text-sm font-medium md:hidden"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              Menu
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="hidden text-sm text-[var(--muted)] hover:text-[var(--foreground)] sm:inline"
            >
              Create account
            </Link>
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          </div>
        )}
      </div>

      {session && menuOpen && (
        <nav
          id={menuId}
          aria-label="Mobile navigation"
          className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 md:hidden"
        >
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Workspace
          </p>
          <ul className="space-y-1">
            {LOGGED_IN_NAV_LINKS.filter((link) => link.group === "core").map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "block rounded-[var(--radius)] px-3 py-3 text-sm",
                    isLoggedInNavLinkActive(pathname, link.href)
                      ? "bg-[var(--card-muted)] font-medium text-[var(--primary)]"
                      : ""
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {showVaultAction && vaultCopy && (
              <li>
                <Link
                  href={vaultCopy.actionHref}
                  onClick={closeMenu}
                  className="block rounded-[var(--radius)] px-3 py-3 text-sm font-medium text-[var(--warning)]"
                >
                  {vaultCopy.actionLabel}
                </Link>
              </li>
            )}
          </ul>

          <p className="mt-4 px-3 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Vault protection
          </p>
          <ul className="space-y-1">
            {LOGGED_IN_NAV_LINKS.filter((link) => link.group === "vault").map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "block rounded-[var(--radius)] px-3 py-3 text-sm",
                    isLoggedInNavLinkActive(pathname, link.href)
                      ? "bg-[var(--card-muted)] font-medium text-[var(--primary)]"
                      : ""
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {showLockVault && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    handleLockVault();
                    closeMenu();
                  }}
                  className="block w-full rounded-[var(--radius)] px-3 py-3 text-left text-sm"
                >
                  Lock vault
                </button>
              </li>
            )}
          </ul>

          <p className="mt-4 px-3 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Account security
          </p>
          <ul className="space-y-1">
            {LOGGED_IN_NAV_LINKS.filter((link) => link.group === "account").map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "block rounded-[var(--radius)] px-3 py-3 text-sm",
                    isLoggedInNavLinkActive(pathname, link.href)
                      ? "bg-[var(--card-muted)] font-medium text-[var(--primary)]"
                      : ""
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
            <Button variant="secondary" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
            {vaultCopy && (
              <p className="px-1 text-xs text-[var(--muted)]">Vault status: {vaultCopy.badgeLabel}</p>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
