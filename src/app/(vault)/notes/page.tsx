"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { PageLayout } from "@/components/layout/page-layout";
import { NotesListGrid } from "@/components/notes/notes-list-grid";
import { NotesSkeletonGrid } from "@/components/notes/notes-skeleton-grid";
import { Button } from "@/components/ui/button";
import { NewNoteAction } from "@/features/notes/new-note-action";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { NoteCard } from "@/components/notes/note-card";
import { NoteListRow } from "@/components/notes/note-list-row";
import {
  defaultNoteFilters,
  hasNoteOrganizers,
  noteFiltersToSearch,
  type NoteFilterState,
} from "@/features/notes/note-filters";
import { NotesListControls } from "@/features/notes/notes-list-controls";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { useNotes } from "@/features/notes/use-notes";
import { cn } from "@/lib/ui/cn";
import { searchVaultIndex, searchVaultIndexWhenLocked } from "@/lib/crypto-client/note-search";
import { listEncryptedNoteDraftKeys } from "@/lib/crypto-client/note-drafts";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { shouldShowNotesListControls } from "@/lib/notes/notes-list-controls-visibility";
import {
  DEFAULT_NOTE_SORT,
  sortNotes,
  type NoteSortOption,
} from "@/lib/notes/note-sort";
import {
  DEFAULT_SMART_FILTER,
  SMART_FILTER_OPTIONS,
  type SmartLocalFilter,
} from "@/lib/notes/smart-filters";
import {
  readNoteViewMode,
  writeNoteViewMode,
  type NoteViewMode,
} from "@/lib/notes/note-view-mode";
import {
  addSavedView,
  createSavedView,
  deleteSavedView,
  type SavedViewCriteria,
} from "@/lib/notes/saved-views";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { NotesWelcome } from "@/features/vault/notes-welcome";
import { findDailyNoteIdForDate } from "@/lib/notes/daily-note";
import { useNoteSearchContext } from "@/features/notes/note-search-context";
import { useNoteSearchBodies } from "@/features/notes/use-note-search-bodies";
import { useNoteListExcerpts } from "@/features/notes/use-note-list-excerpts";
import { getRecentlyViewedNoteIds } from "@/lib/notes/recently-viewed";

export default function NotesPage() {
  const vault = useRequireVault();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const vaultClient = useVaultClientStatus();
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const { index, loading, error, mutateIndex } = useVaultIndex(vaultUserId, vaultUnlocked);
  const { toggleNoteResolved } = useNotes(vaultUserId);
  const [filters, setFilters] = useState<NoteFilterState>(defaultNoteFilters);
  const [smartFilter, setSmartFilter] = useState<SmartLocalFilter>(DEFAULT_SMART_FILTER);
  const [sort, setSort] = useState<NoteSortOption>(DEFAULT_NOTE_SORT);
  const [viewMode, setViewMode] = useState<NoteViewMode>(() => readNoteViewMode());
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [draftNoteIds, setDraftNoteIds] = useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const { query: searchHighlightQuery, setQuery: setSearchHighlightQuery } = useNoteSearchContext();

  // The header (desktop) and the mobile search both drive the shared search
  // context; mirror it into the filter state used for searching the index.
  useEffect(() => {
    setFilters((current) =>
      current.search === searchHighlightQuery ? current : { ...current, search: searchHighlightQuery }
    );
  }, [searchHighlightQuery]);

  // Deep-linkable Library views (sidebar) ↔ top chips, both driven by the URL.
  // No `view` param means "All" (all-active), so sidebar "All notes" and the
  // "All" chip select together; ?view=pinned selects "Pinned" in both, etc.
  useEffect(() => {
    const next = viewParam ?? "all-active";
    if (SMART_FILTER_OPTIONS.some((option) => option.value === next)) {
      setSmartFilter(next as SmartLocalFilter);
      setActiveSavedViewId(null);
    }
  }, [viewParam]);

  const { bodies: searchBodies, loading: searchBodiesLoading } = useNoteSearchBodies(
    index,
    filters.search,
    vaultUnlocked
  );

  const { excerpts: noteExcerpts, previews: notePreviews } = useNoteListExcerpts(
    index,
    vaultUnlocked,
    Boolean(vaultUnlocked && index && !filters.search.trim())
  );

  useEffect(() => subscribeVaultSession(() => {
    setFilters(defaultNoteFilters);
    setSmartFilter(DEFAULT_SMART_FILTER);
    setActiveSavedViewId(null);
    setDraftNoteIds(new Set());
    setSearchHighlightQuery("");
  }), [setSearchHighlightQuery]);

  useEffect(() => {
    if (!vaultUserId || !vaultUnlocked) return;
    void listEncryptedNoteDraftKeys(vaultUserId).then((keys) => {
      setDraftNoteIds(new Set(keys.filter((key) => key !== "new")));
    });
  }, [vaultUserId, vaultUnlocked, index]);

  const activeCategories = useMemo(
    () => (index ? index.categories.filter((category) => !category.deletedAt) : []),
    [index]
  );
  const activeTags = useMemo(
    () => (index ? index.tags.filter((tag) => !tag.deletedAt) : []),
    [index]
  );
  const showOrganizerFilters = hasNoteOrganizers(activeCategories, activeTags);

  const searchFilters = useMemo(
    () => ({
      ...noteFiltersToSearch(filters),
      smartFilter,
      draftNoteIds,
    }),
    [filters, smartFilter, draftNoteIds]
  );

  const allNotes = useMemo(() => {
    if (!vaultUnlocked || !index) return searchVaultIndexWhenLocked();
    return searchVaultIndex(index, { smartFilter: "all-active", draftNoteIds });
  }, [vaultUnlocked, index, draftNoteIds]);

  const filteredNotes = useMemo(() => {
    if (!vaultUnlocked || !index) return searchVaultIndexWhenLocked();
    const hasSearch = Boolean(filters.search.trim());
    const bodies = hasSearch && searchBodies ? searchBodies : undefined;
    const results = searchVaultIndex(index, searchFilters, bodies);
    if (smartFilter === "recently-viewed") {
      const order = getRecentlyViewedNoteIds(index);
      return [...results].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    return sortNotes(results, sort);
  }, [vaultUnlocked, index, searchFilters, sort, smartFilter, filters.search, searchBodies]);

  const pinnedNotesCount = useMemo(
    () => allNotes.filter((note) => note.pinned && !note.trashed).length,
    [allNotes]
  );

  const showListControls = shouldShowNotesListControls({
    hasOrganizers: showOrganizerFilters,
    totalNotes: allNotes.length,
    smartFilter,
    filters,
    hasSavedViews: (index?.savedViews?.length ?? 0) > 0,
  });

  const currentSavedViewCriteria = useMemo(
    (): SavedViewCriteria => ({
      smartFilter,
      search: filters.search,
      categoryId: filters.categoryId,
      tagId: filters.tagId,
      resolved: filters.resolved,
      sort,
    }),
    [smartFilter, filters, sort]
  );

  const handleViewModeChange = useCallback((mode: NoteViewMode) => {
    setViewMode(mode);
    writeNoteViewMode(mode);
  }, []);

  const handleApplySavedView = useCallback(
    (view: { id: string; criteria: SavedViewCriteria }) => {
      setActiveSavedViewId(view.id);
      setSmartFilter(view.criteria.smartFilter);
      setFilters({
        search: view.criteria.search ?? "",
        categoryId: view.criteria.categoryId ?? "all",
        tagId: view.criteria.tagId ?? "all",
        resolved: view.criteria.resolved ?? "all",
      });
      if (view.criteria.sort) setSort(view.criteria.sort);
    },
    []
  );

  const handleSaveView = useCallback(
    async (name: string, criteria: SavedViewCriteria) => {
      if (!index) return;
      const view = createSavedView(name, criteria);
      await mutateIndex((current) => addSavedView(current, view));
      setActiveSavedViewId(view.id);
    },
    [index, mutateIndex]
  );

  const handleDeleteSavedView = useCallback(
    async (viewId: string) => {
      await mutateIndex((current) => deleteSavedView(current, viewId));
      setActiveSavedViewId(null);
    },
    [mutateIndex]
  );

  const handleToggleResolved = useCallback(
    async (noteId: string, currentAnswered: boolean) => {
      setResolveError(null);
      setResolvingId(noteId);
      const nextAnswered = !currentAnswered;
      const previousUpdatedAt =
        index?.entries.find((item) => item.id === noteId)?.updatedAt ?? new Date().toISOString();

      try {
        await mutateIndex((current) => ({
          ...current,
          entries: current.entries.map((item) =>
            item.id === noteId
              ? { ...item, answered: nextAnswered, updatedAt: new Date().toISOString() }
              : item
          ),
        }));
        await toggleNoteResolved(noteId, nextAnswered);
      } catch (e) {
        setResolveError(e instanceof Error ? e.message : "Failed to update note");
        await mutateIndex((current) => ({
          ...current,
          entries: current.entries.map((item) =>
            item.id === noteId
              ? { ...item, answered: currentAnswered, updatedAt: previousUpdatedAt }
              : item
          ),
        }));
      } finally {
        setResolvingId(null);
      }
    },
    [index?.entries, mutateIndex, toggleNoteResolved]
  );

  const openDailyNote = useCallback(() => {
    if (!index) return;
    const existingId = findDailyNoteIdForDate(index.entries);
    if (existingId) {
      router.push(`/notes/${existingId}`);
      return;
    }
    router.push("/notes/new?daily=1");
  }, [index, router]);

  if (vault.status === "loading" || vault.status === "redirecting" || vaultClient.status === "loading" || loading) {
    return (
      <AuthenticatedPage width="notes">
        <PageHeader
          title="Notes"
          description="Your encrypted space for prayers, reflections, and private notes."
        />
        <NotesSkeletonGrid />
      </AuthenticatedPage>
    );
  }

  if (vault.status === "error" || vaultClient.status === "error") {
    return (
      <PageLayout>
        <ErrorState
          message={
            vault.status === "error"
              ? vault.message
              : vaultClient.status === "error"
                ? vaultClient.message
                : "Failed to load notes"
          }
        />
      </PageLayout>
    );
  }

  if (clientStatus && clientStatus !== "unlocked" && clientStatus !== "locked") {
    if (clientStatus === "not_configured") {
      return (
        <PageLayout>
          <NotesWelcome />
        </PageLayout>
      );
    }
    return (
      <AuthenticatedPage width="notes">
        <LoadingState label="Opening SelahKeep" />
      </AuthenticatedPage>
    );
  }

  const counterLabel = `${allNotes.length} ${allNotes.length === 1 ? "note" : "notes"}${
    pinnedNotesCount > 0 ? ` · ${pinnedNotesCount} pinned` : ""
  }`;

  return (
    <AuthenticatedPage width="notes">
      {/* Mobile search row (desktop search lives in the header top bar). */}
      <div className="mb-6 flex items-center gap-3 md:hidden">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            type="search"
            data-testid="note-search"
            value={searchHighlightQuery}
            onChange={(e) => setSearchHighlightQuery(e.target.value)}
            placeholder="Search your notes"
            aria-label="Search your notes"
            className="w-full rounded-[9px] border border-[var(--border)] bg-[var(--bg-2)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--border-2)] focus:outline-none"
          />
        </div>
        <NewNoteAction onDailyNote={openDailyNote} />
      </div>

      {/* Title + counter (left) and the primary filter chips (right). */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Notes
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]" data-testid="notes-counter">
            {counterLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" data-testid="smart-filter-chips" role="tablist" aria-label="Filter notes">
          {[
            { value: "all-active" as const, label: "All" },
            { value: "pinned" as const, label: "Pinned" },
            { value: "recently-viewed" as const, label: "Recently viewed" },
          ].map((chip) => {
            const active = smartFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`smart-filter-chip-${chip.value}`}
                onClick={() => {
                  // Drive via the URL so the sidebar Library stays in sync.
                  setSmartFilter(chip.value);
                  setActiveSavedViewId(null);
                  router.replace(
                    chip.value === "all-active" ? "/notes" : `/notes?view=${chip.value}`,
                    { scroll: false }
                  );
                }}
                className={cn(
                  "rounded-[8px] px-3.5 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[var(--primary-solid)] text-[var(--on-primary)]"
                    : "border border-[var(--border)] bg-[var(--card)] text-[var(--fg-2)] hover:bg-[var(--card-2)]"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          className="mx-auto my-12 max-w-[420px] rounded-[14px] border border-[var(--danger-bd)] bg-[var(--danger-bg)] p-7 text-center"
          role="alert"
          data-testid="notes-error-card"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--danger-bd)] bg-[var(--card)] text-[var(--danger)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.01" />
            </svg>
          </div>
          <div className="text-[17px] font-semibold text-[var(--foreground)]">
            We couldn&apos;t reach your vault
          </div>
          <p className="mx-auto mt-1.5 max-w-[20rem] text-sm leading-relaxed text-[var(--fg-2)]">
            Your notes are safe and still encrypted. This looks like a connection issue, not a
            problem with your data.
          </p>
          <div className="mt-5">
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </div>
        </div>
      )}

      {resolveError && (
        <div className="mb-6">
          <ErrorState message={resolveError} onRetry={() => setResolveError(null)} />
        </div>
      )}



      {error ? null : filteredNotes.length === 0 ? (
        <EmptyState
          plain={allNotes.length === 0}
          icon={
            allNotes.length === 0 ? (
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3c0 6-3 9-6 10 3 1 6 4 6 8 0-4 3-7 6-8-3-1-6-4-6-10Z" />
              </svg>
            ) : undefined
          }
          title={
            smartFilter === "recently-viewed"
              ? "No recently viewed notes yet"
              : allNotes.length === 0
                ? "A quiet, empty page"
                : searchBodiesLoading && filters.search.trim()
                  ? "Searching your notes…"
                  : "No matching notes"
          }
          description={
            smartFilter === "recently-viewed"
              ? "Open a note to see it here."
              : allNotes.length === 0
                ? "Write the first thing on your mind — it's encrypted before it ever leaves this device."
                : "Try adjusting your search or filters to find what you're looking for."
          }
          action={
            allNotes.length === 0 ? (
              <Link href="/notes/new">
                <Button data-testid="empty-state-new-note">Write your first note</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        (() => {
          const renderNote = (note: (typeof filteredNotes)[number]) =>
            viewMode === "list" ? (
              <li key={note.id}>
                <NoteListRow
                  id={note.id}
                  title={note.title}
                  answered={note.answered}
                  pinned={note.pinned}
                  favorite={note.favorite}
                  archived={note.archived}
                  trashed={note.trashed}
                  createdAt={note.createdAt}
                  updatedAt={note.updatedAt}
                  categoryName={note.categoryName}
                  tagNames={note.tagNames}
                  searchQuery={searchHighlightQuery}
                  bodyExcerpt={noteExcerpts.get(note.id) ?? null}
                  kanbanTotal={note.kanbanTotal}
                  kanbanDone={note.kanbanDone}
                  resolving={resolvingId === note.id}
                  onToggleResolved={
                    note.trashed ? undefined : () => void handleToggleResolved(note.id, note.answered)
                  }
                />
              </li>
            ) : (
              <li key={note.id}>
                <NoteCard
                  id={note.id}
                  title={note.title}
                  answered={note.answered}
                  pinned={note.pinned}
                  favorite={note.favorite}
                  archived={note.archived}
                  trashed={note.trashed}
                  createdAt={note.createdAt}
                  updatedAt={note.updatedAt}
                  categoryName={note.categoryName}
                  tagNames={note.tagNames}
                  searchQuery={searchHighlightQuery}
                  bodySnippet={note.bodySnippet}
                  bodyExcerpt={noteExcerpts.get(note.id) ?? null}
                  bodyPreview={notePreviews.get(note.id) ?? null}
                  kanbanTotal={note.kanbanTotal}
                  kanbanDone={note.kanbanDone}
                  resolving={resolvingId === note.id}
                  onToggleResolved={
                    note.trashed ? undefined : () => void handleToggleResolved(note.id, note.answered)
                  }
                />
              </li>
            );

          const pinnedNotes = filteredNotes.filter((n) => n.pinned && !n.trashed);
          const otherNotes = filteredNotes.filter((n) => !(n.pinned && !n.trashed));
          const grouped = pinnedNotes.length > 0 && otherNotes.length > 0;

          if (!grouped) {
            return <NotesListGrid viewMode={viewMode}>{filteredNotes.map(renderNote)}</NotesListGrid>;
          }

          return (
            <div className="space-y-6" data-testid="notes-grouped">
              <section>
                <div
                  className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                  data-testid="notes-group-pinned"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="var(--accent)"
                    stroke="var(--accent)"
                    strokeWidth="1.2"
                    aria-hidden="true"
                  >
                    <path d="M9 3h6l-1 6 4 3v2h-5v7l-1 0-1 0v-7H5v-2l4-3z" />
                  </svg>
                  Pinned
                </div>
                <NotesListGrid viewMode={viewMode} columns={2}>
                  {pinnedNotes.map(renderNote)}
                </NotesListGrid>
              </section>
              <section>
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Earlier
                </div>
                <NotesListGrid viewMode={viewMode} columns={3}>
                  {otherNotes.map(renderNote)}
                </NotesListGrid>
              </section>
            </div>
          );
        })()
      )}
    </AuthenticatedPage>
  );
}
