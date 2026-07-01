"use client";

import { usePathname } from "next/navigation";
import { useNoteSearchContext } from "@/features/notes/note-search-context";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";

/**
 * Desktop top-bar search: shares the header toolbar row with the vault dock
 * (search left, dock right) and drives the notes list via shared search context.
 * Only shown on the notes list with an unlocked vault — searching only makes
 * sense where notes are actually listed.
 */
export function HeaderSearch() {
  const { query, setQuery } = useNoteSearchContext();
  const pathname = usePathname();
  const vaultClient = useVaultClientStatus();
  const unlocked = vaultClient.status === "ready" && vaultClient.clientStatus === "unlocked";

  if (pathname !== "/notes" || !unlocked) return null;

  return (
    <div className="relative w-full">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        type="search"
        data-testid="header-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your notes"
        aria-label="Search your notes"
        className="w-full rounded-[9px] border border-[var(--border)] bg-[var(--bg-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--border-2)] focus:outline-none"
      />
    </div>
  );
}
