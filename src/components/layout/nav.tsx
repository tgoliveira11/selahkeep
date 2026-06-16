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
import { useVaultSessionUnlocked } from "@/features/vault/use-vault-session-unlocked";
import { cn } from "@/lib/ui/cn";

const navLinks = [
  { href: "/letters", label: "My letters" },
  { href: "/letters/new", label: "Write" },
  { href: "/vault/devices", label: "Devices" },
  { href: "/vault/recovery", label: "Recovery" },
  { href: "/settings/account", label: "Account" },
] as const;

function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/settings/account") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname === "/settings/security" ||
      pathname.startsWith("/settings/security/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();
  const vaultUnlocked = useVaultSessionUnlocked();
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={session ? "/letters" : "/"}
          className="flex items-center gap-2 text-lg font-semibold text-[var(--primary)]"
        >
          <AppMark size={28} />
          <span>Letters to God</span>
        </Link>

        {session ? (
          <>
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-[var(--radius)] px-3 py-2 text-sm transition-colors hover:bg-[var(--card-muted)]",
                    isNavLinkActive(pathname, link.href)
                      ? "font-medium text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {!vaultUnlocked && (
                <Link
                  href="/vault/unlock"
                  className="rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--warning)] hover:bg-[var(--card-muted)]"
                >
                  Unlock
                </Link>
              )}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {vaultUnlocked && (
                <Button variant="secondary" onClick={handleLockVault}>
                  Lock vault
                </Button>
              )}
              <Button variant="secondary" onClick={handleSignOut}>
                Sign out
              </Button>
              {vaultUnlocked ? (
                <Badge variant="success">Unlocked</Badge>
              ) : (
                <Badge variant="muted">Locked</Badge>
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
            <Link href="/register" className="hidden text-sm text-[var(--muted)] hover:text-[var(--foreground)] sm:inline">
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
          aria-label="Main navigation"
          className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 md:hidden"
        >
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  className={cn(
                    "block rounded-[var(--radius)] px-3 py-3 text-sm",
                    isNavLinkActive(pathname, link.href) ? "bg-[var(--card-muted)] font-medium" : ""
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {!vaultUnlocked && (
              <li>
                <Link href="/vault/unlock" onClick={closeMenu} className="block rounded-[var(--radius)] px-3 py-3 text-sm text-[var(--warning)]">
                  Unlock vault
                </Link>
              </li>
            )}
          </ul>
          <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
            {vaultUnlocked && (
              <Button variant="secondary" className="w-full" onClick={handleLockVault}>
                Lock vault
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
            <p className="px-1 text-xs text-[var(--muted)]">
              Vault status: {vaultUnlocked ? "Unlocked on this browser" : "Locked"}
            </p>
          </div>
        </nav>
      )}
    </header>
  );
}
