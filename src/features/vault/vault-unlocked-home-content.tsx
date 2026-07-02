"use client";

import Link from "next/link";
import { cn } from "@/lib/ui/cn";

const linkButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] px-4 py-2.5 text-sm font-semibold transition-colors";

/** Logged-in home when the vault is unlocked — vault-free landing with navigation to notes. */
export function VaultUnlockedHomeContent() {
  return (
    <div className="mx-auto max-w-3xl text-center" data-testid="logged-in-home-unlocked">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        Welcome back
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg-2)]">
        Your vault is unlocked. Open your notes when you are ready, or manage your account and
        vault settings from the sidebar.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/notes"
          className={cn(
            linkButtonClass,
            "bg-[var(--primary-solid)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          )}
        >
          Go to your notes
        </Link>
        <Link
          href="/settings/account"
          className={cn(
            linkButtonClass,
            "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--card-muted)]"
          )}
        >
          Account settings
        </Link>
      </div>
    </div>
  );
}
