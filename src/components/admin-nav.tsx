"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button, useUiPaths } from "@tgoliveira/secure-auth/react";

const ADMIN_NAV_ITEMS = [
  { suffix: "", label: "Overview" },
  { suffix: "/users", label: "Users" },
  { suffix: "/waitlist", label: "Waitlist" },
  { suffix: "/invites", label: "Invites" },
  { suffix: "/locks", label: "Locks" },
  { suffix: "/api-keys", label: "API Keys" },
  { suffix: "/config", label: "Config" },
] as const;

export function AdminNav() {
  const resolved = useUiPaths();
  const pathname = usePathname();
  const base = resolved.adminPanel ?? "/admin";

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-[1000px] items-center gap-4 px-6 py-0">
        <Link
          href={base}
          className="flex shrink-0 items-center gap-2 py-3 text-sm font-semibold text-[var(--foreground)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--danger)] text-[10px] font-bold text-white">
            A
          </span>
          Admin
        </Link>
        <div className="h-5 w-px shrink-0 bg-[var(--border)]" />
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {ADMIN_NAV_ITEMS.map(({ suffix, label }) => {
            const href = `${base}${suffix}`;
            const isActive = suffix === "" ? pathname === base : pathname.startsWith(href);
            return (
              <Link
                key={suffix}
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
          })}
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
