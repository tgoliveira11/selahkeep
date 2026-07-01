"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button, useUiPaths } from "@tgoliveira/secure-auth/react";
import {
  OUTPOST_NAV_ITEMS,
  SECURE_AUTH_NAV_ITEMS,
  VAULT_NAV_ITEMS,
} from "@/lib/admin/admin-hub-links";

type NavItem = { suffix: string; label: string };

function NavSection({
  items,
  base,
  pathname,
}: {
  items: readonly NavItem[];
  base: string;
  pathname: string;
}) {
  return items.map(({ suffix, label }) => {
    const href = `${base}${suffix}`;
    const isActive = suffix === "" ? pathname === base : pathname.startsWith(href);
    return (
      <Link
        key={`${base}${suffix}`}
        href={href}
        className={`whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors ${
          isActive
            ? "bg-[var(--card-muted)] font-medium text-[var(--foreground)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        {label}
      </Link>
    );
  });
}

export function AdminNav({
  outpostAdminBase,
  vaultAdminBase,
}: {
  outpostAdminBase: string;
  vaultAdminBase: string;
}) {
  const resolved = useUiPaths();
  const pathname = usePathname();
  const secureAuthBase = resolved.adminPanel ?? "/admin";

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-[1000px] items-center gap-4 px-6 py-0">
        <Link
          href={secureAuthBase}
          className="flex shrink-0 items-center gap-2 py-3 text-sm font-semibold text-[var(--foreground)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--danger)] text-[10px] font-bold text-white">
            A
          </span>
          Admin
        </Link>
        <div className="h-5 w-px shrink-0 bg-[var(--border)]" />
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          <NavSection items={SECURE_AUTH_NAV_ITEMS} base={secureAuthBase} pathname={pathname} />
          <div className="mx-1 h-5 w-px shrink-0 bg-[var(--border)]" />
          <NavSection items={OUTPOST_NAV_ITEMS} base={outpostAdminBase} pathname={pathname} />
          <div className="mx-1 h-5 w-px shrink-0 bg-[var(--border)]" />
          <NavSection items={VAULT_NAV_ITEMS} base={vaultAdminBase} pathname={pathname} />
        </nav>
        <div className="flex shrink-0 items-center gap-3 py-2">
          <Link
            href={resolved.afterLogin}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← App
          </Link>
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => signOut({ callbackUrl: resolved.login })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
