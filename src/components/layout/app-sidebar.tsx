"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppMark } from "@/components/ui/app-mark";
import { signOutAccount } from "@/lib/auth/sign-out-client";
import { isFullyAuthenticatedSession } from "@/lib/auth/session-state";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { clearVaultClientState } from "@/lib/crypto-client/vault";
import { lockVaultSession } from "@/lib/crypto-client/vault-session";
import { PRODUCT_NAME } from "@/lib/marketing/brand";
import { cn } from "@/lib/ui/cn";

/** Library destinations (filtered views of the notes list), matching the mockup. */
const LIBRARY: { href: string; view: string | null; label: string; icon: React.ReactNode }[] = [
  {
    href: "/notes",
    view: null,
    label: "All notes",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M8 9h7M8 13h7" />
      </svg>
    ),
  },
  {
    href: "/notes?view=pinned",
    view: "pinned",
    label: "Pinned",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        <path d="M9 3h6l-1 6 4 3v2h-5v7l-1 0-1 0v-7H5v-2l4-3z" />
      </svg>
    ),
  },
  {
    href: "/notes?view=resolved",
    view: "resolved",
    label: "Resolved",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  {
    href: "/notes?view=archived",
    view: "archived",
    label: "Archive",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
      </svg>
    ),
  },
];

/**
 * Desktop left sidebar (Stillness design system). Replaces the horizontal
 * header nav on `md+` with a full-height rail: brand, a New note CTA, the
 * Library (All notes / Pinned / Resolved / Archive — deep-linked filtered
 * views), and an account footer (Account, Vault, sign out). Authenticated-only
 * and hidden on small screens. See `docs/design/`.
 */
export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const vaultClient = useVaultClientStatus();

  if (!isFullyAuthenticatedSession(session)) return null;
  // Hide the rail while the vault is locked so the unlock screen is full-bleed
  // (matches the mockup); it returns once the vault is open.
  if (vaultClient.status === "ready" && vaultClient.clientStatus !== "unlocked") {
    return null;
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

  const onNotes = pathname === "/notes";
  const view = searchParams.get("view");
  const initial = (session?.user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <aside
      data-testid="app-sidebar"
      className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col border-r border-[var(--border)] bg-[var(--card)] px-4 py-5 md:flex"
    >
      <Link
        href="/notes"
        className="mb-[18px] flex items-center gap-2 px-2 text-[17px] font-semibold tracking-[0.01em] text-[var(--primary)]"
      >
        <AppMark size={28} />
        <span>{PRODUCT_NAME}</span>
      </Link>

      <Link
        href="/notes/new"
        className="mb-[18px] flex items-center gap-2 rounded-[9px] bg-[var(--primary-solid)] px-3 py-2.5 text-sm font-semibold text-[var(--on-primary)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New note
      </Link>

      <p className="px-2 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Library
      </p>
      <nav aria-label="Library" className="flex flex-col gap-0.5">
        {LIBRARY.map((item) => {
          const active = onNotes && (item.view ? view === item.view : !view);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                active
                  ? "bg-[var(--lilac)] font-semibold text-[var(--primary)]"
                  : "text-[var(--fg-2)] hover:bg-[var(--card-2)]"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[linear-gradient(150deg,var(--accent),var(--primary-solid))] text-xs font-semibold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1 text-[12.5px]">
            <div className="truncate font-semibold text-[var(--foreground)]">
              {session?.user?.email ?? "Account"}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <Link href="/settings/account" className="hover:text-[var(--foreground)]">
                Account
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/vault/settings" className="hover:text-[var(--foreground)]">
                Vault
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex-none rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--card-2)] hover:text-[var(--foreground)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
