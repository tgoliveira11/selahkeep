"use client";

import { usePathname, useRouter } from "next/navigation";
import { useNoteSearchContext } from "@/features/notes/note-search-context";

/**
 * Desktop top-bar search (mockup): lives in the header beside the vault dock
 * and drives the notes list via the shared search context. Typing elsewhere
 * jumps to /notes so the results are visible.
 */
export function HeaderSearch() {
  const { query, setQuery } = useNoteSearchContext();
  const pathname = usePathname();
  const router = useRouter();

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
        onChange={(e) => {
          setQuery(e.target.value);
          if (!pathname.startsWith("/notes")) router.push("/notes");
        }}
        placeholder="Search your notes"
        aria-label="Search your notes"
        className="w-full rounded-[9px] border border-[var(--border)] bg-[var(--bg-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--border-2)] focus:outline-none"
      />
    </div>
  );
}
