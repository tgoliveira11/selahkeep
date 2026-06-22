"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { PageLayout } from "@/components/layout/page-layout";
import { NotesListGrid } from "@/components/notes/notes-list-grid";
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
import { NotesVaultProtectedMessage } from "@/features/notes/notes-vault-protected-message";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { useNotes } from "@/features/notes/use-notes";
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

  useEffect(() => {
    setSearchHighlightQuery(filters.search);
  }, [filters.search, setSearchHighlightQuery]);

  const { bodies: searchBodies, loading: searchBodiesLoading } = useNoteSearchBodies(
    index,
    filters.search,
    vaultUnlocked
  );

  const { excerpts: noteExcerpts } = useNoteListExcerpts(
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
      <PageLayout>
        <LoadingState label="Loading your notes" />
      </PageLayout>
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

  if (clientStatus && clientStatus !== "unlocked") {
    return (
      <PageLayout>
        {clientStatus === "not_configured" ? (
          <NotesWelcome />
        ) : (
          <>
            <PageHeader
              title="Notes"
              description="Private encrypted notes — prayers, reflections, and journaling in one vault."
            />
            {clientStatus === "locked" && <NotesVaultProtectedMessage />}
          </>
        )}
      </PageLayout>
    );
  }

  return (
    <AuthenticatedPage width="notes">
      <PageHeader
        title="Notes"
        description="Your encrypted space for prayers, reflections, and private notes."
        action={<NewNoteAction onDailyNote={openDailyNote} />}
      />

      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      {resolveError && (
        <div className="mb-6">
          <ErrorState message={resolveError} onRetry={() => setResolveError(null)} />
        </div>
      )}

      {vaultUnlocked && index && showListControls && (
        <NotesListControls
          filteredCount={filteredNotes.length}
          totalCount={allNotes.length}
          sort={sort}
          onSortChange={setSort}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          smartFilter={smartFilter}
          onSmartFilterChange={setSmartFilter}
          filters={filters}
          onFiltersChange={setFilters}
          categories={activeCategories}
          tags={activeTags}
          savedViews={index.savedViews ?? []}
          activeSavedViewId={activeSavedViewId}
          currentSavedViewCriteria={currentSavedViewCriteria}
          onApplySavedView={handleApplySavedView}
          onSaveView={handleSaveView}
          onDeleteSavedView={handleDeleteSavedView}
          onRecentlyViewed={() => {
            setSmartFilter("recently-viewed");
            setActiveSavedViewId(null);
          }}
          trashNotice={smartFilter === "trash"}
        />
      )}

      {vaultUnlocked && index && !showListControls && !showOrganizerFilters && smartFilter === "all-active" && allNotes.length === 0 && (
        <p className="mb-6 text-sm text-[var(--muted)]">
          Create categories or tags to start filtering your notes.
        </p>
      )}

      {filteredNotes.length === 0 ? (
        <EmptyState
          title={
            smartFilter === "recently-viewed"
              ? "No recently viewed notes yet"
              : allNotes.length === 0
                ? "Start your first private note"
                : searchBodiesLoading && filters.search.trim()
                  ? "Searching your notes…"
                  : "No matching notes"
          }
          description={
            smartFilter === "recently-viewed"
              ? "Open a note to see it here after you unlock your vault."
              : allNotes.length === 0
                ? "Write a prayer, reflection, decision, or journal entry inside your encrypted vault."
                : "Try adjusting your search or filters to find what you're looking for."
          }
          action={
            allNotes.length === 0 ? (
              <Link href="/notes/new">
                <Button data-testid="empty-state-new-note">New note</Button>
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
                <NotesListGrid viewMode={viewMode}>{pinnedNotes.map(renderNote)}</NotesListGrid>
              </section>
              <section>
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Earlier
                </div>
                <NotesListGrid viewMode={viewMode}>{otherNotes.map(renderNote)}</NotesListGrid>
              </section>
            </div>
          );
        })()
      )}
    </AuthenticatedPage>
  );
}
