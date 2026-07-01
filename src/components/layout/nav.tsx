"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutAccount } from "@/lib/auth/sign-out-client";
import { isFullyAuthenticatedSession } from "@/lib/auth/session-state";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppMark } from "@/components/ui/app-mark";
import { clearVaultClientState } from "@/lib/crypto-client/vault";
import { lockVaultSession } from "@/lib/crypto-client/vault-session";
import {
  getLoggedInNavLinks,
  isLoggedInNavLinkActive,
} from "@/lib/navigation/logged-in-nav";
import { cn } from "@/lib/ui/cn";
import { PRODUCT_NAME } from "@/lib/marketing/brand";
import { VaultStatusDock } from "@/features/vault/vault-status-dock";
import { VaultLockOverlayExclude } from "@/features/vault/vault-protected-shell";
import { HeaderSearch } from "@/components/layout/header-search";

export function Nav() {
  const { data: session } = useSession();
  const authenticated = isFullyAuthenticatedSession(session);
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
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

  return (
    <VaultLockOverlayExclude>
    <header
      className={cn(
        // Authenticated: the top bar (search + vault dock) with a divider below,
        // matching the mockup. Solid background so content scrolls cleanly under
        // the sticky header. Logged-out marketing keeps its card header.
        authenticated
          ? "authenticated-header border-b border-[var(--border)] bg-[var(--background)]"
          : "bg-[var(--card)] border-b border-[var(--border)]"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4",
          // Fixed height so the top bar stays consistent whether or not the
          // search field is shown (the dock is vertically centered in it).
          authenticated ? "h-16 md:px-6 lg:px-8" : "mx-auto max-w-4xl py-3"
        )}
      >
        <Link
          href={authenticated ? "/notes" : "/"}
          className={cn(
            "flex items-center gap-2 text-lg font-semibold text-[var(--primary)]",
            // On desktop the sidebar carries the brand for authenticated users.
            authenticated && "md:hidden"
          )}
        >
          <AppMark size={28} />
          <span>{PRODUCT_NAME}</span>
        </Link>

        {/* Desktop search lives in the top bar, beside the vault dock. */}
        {authenticated && (
          <div className="hidden flex-1 pr-[13.5rem] md:block">
            <HeaderSearch />
          </div>
        )}

        {authenticated ? (
          <>
            {/* Primary nav + sign out live in the desktop sidebar (md+); on
                mobile they are in the menu below. */}
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

      {authenticated && menuOpen && (
        <nav
          id={menuId}
          aria-label="Mobile navigation"
          className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 md:hidden"
        >
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Workspace
          </p>
          <ul className="space-y-1">
            {getLoggedInNavLinks().filter((link) => link.group === "core").map((link) => (
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

          <p className="mt-4 px-3 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Vault protection
          </p>
          <ul className="space-y-1">
            {getLoggedInNavLinks().filter((link) => link.group === "vault").map((link) => (
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

          <p className="mt-4 px-3 pb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Account security
          </p>
          <ul className="space-y-1">
            {getLoggedInNavLinks().filter((link) => link.group === "account").map((link) => (
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

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <Button variant="secondary" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </nav>
      )}
      {/* The vault status dock is a desktop-only affordance. On mobile it is
          fully hidden (and non-interactive); mobile unlock happens on the
          dedicated /vault/unlock page instead. */}
      {authenticated ? (
        <div className="hidden md:block">
          <VaultStatusDock />
        </div>
      ) : null}
    </header>
    </VaultLockOverlayExclude>
  );
}
