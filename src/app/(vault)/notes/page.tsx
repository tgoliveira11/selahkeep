"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { FormField } from "@/components/ui/form-field";
import { NoteCard } from "@/components/notes/note-card";
import { NoteListRow } from "@/components/notes/note-list-row";
import {
  NoteFilters,
  defaultNoteFilters,
  hasNoteOrganizers,
  noteFiltersToSearch,
  type NoteFilterState,
} from "@/features/notes/note-filters";
import { SmartFilterBar } from "@/features/notes/smart-filter-bar";
import { SavedViewsBar } from "@/features/notes/saved-views-bar";
import { ViewModeToggle } from "@/features/notes/view-mode-toggle";
import { NotesVaultProtectedMessage } from "@/features/notes/notes-vault-protected-message";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { useNotes } from "@/features/notes/use-notes";
import { searchVaultIndex, searchVaultIndexWhenLocked } from "@/lib/crypto-client/note-search";
import { listEncryptedNoteDraftKeys } from "@/lib/crypto-client/note-drafts";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { formatNoteCount } from "@/lib/notes/note-count";
import {
  DEFAULT_NOTE_SORT,
  NOTE_SORT_OPTIONS,
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

  useEffect(() => subscribeVaultSession(() => {
    setFilters(defaultNoteFilters);
    setSmartFilter(DEFAULT_SMART_FILTER);
    setActiveSavedViewId(null);
    setDraftNoteIds(new Set());
  }), []);

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
    return sortNotes(searchVaultIndex(index, searchFilters), sort);
  }, [vaultUnlocked, index, searchFilters, sort]);

  const noteCountLabel = formatNoteCount(filteredNotes.length, allNotes.length);

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
    <PageLayout>
      <PageHeader
        title="Notes"
        description="Private encrypted notes — prayers, reflections, and journaling in one vault."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              data-testid="new-daily-note"
              onClick={openDailyNote}
            >
              New daily note
            </Button>
            <Link href="/notes/new">
              <Button className="w-full sm:w-auto">New note</Button>
            </Link>
          </div>
        }
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

      {vaultUnlocked && index && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-[var(--muted)]" data-testid="notes-counter" aria-live="polite">
              {noteCountLabel}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <ViewModeToggle mode={viewMode} onChange={handleViewModeChange} />
              <FormField id="note-sort" label="Sort by" className="sm:w-56">
                <select
                  id="note-sort"
                  className="w-full min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as NoteSortOption)}
                >
                  {NOTE_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <SmartFilterBar value={smartFilter} onChange={setSmartFilter} />
          </div>

          <SavedViewsBar
            views={index.savedViews ?? []}
            activeViewId={activeSavedViewId}
            currentCriteria={currentSavedViewCriteria}
            onApply={handleApplySavedView}
            onSave={handleSaveView}
            onDelete={handleDeleteSavedView}
          />

          {smartFilter === "trash" && (
            <p className="mb-4 text-sm text-[var(--muted)]" data-testid="trash-notice">
              Trash auto-purge is not implemented yet. Notes remain until you delete them permanently.
            </p>
          )}
        </>
      )}

      {vaultUnlocked && index && showOrganizerFilters && (
        <NoteFilters
          filters={filters}
          categories={activeCategories}
          tags={activeTags}
          onChange={setFilters}
        />
      )}

      {vaultUnlocked && index && !showOrganizerFilters && smartFilter === "all-active" && (
        <p className="mb-6 text-sm text-[var(--muted)]">
          Create categories or tags to start filtering your notes.
        </p>
      )}

      {filteredNotes.length === 0 ? (
        <EmptyState
          title={allNotes.length === 0 ? "No notes yet" : "No matching notes"}
          description={
            allNotes.length === 0
              ? "When you're ready, write your first private note. It stays protected on your device before it is saved."
              : "Try adjusting your search or filters to find what you're looking for."
          }
          action={
            allNotes.length === 0 ? (
              <Link href="/notes/new">
                <Button>Write your first note</Button>
              </Link>
            ) : undefined
          }
        />
      ) : viewMode === "list" ? (
        <ul className="space-y-2">
          {filteredNotes.map((note) => (
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
                resolving={resolvingId === note.id}
                onToggleResolved={
                  note.trashed ? undefined : () => void handleToggleResolved(note.id, note.answered)
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {filteredNotes.map((note) => (
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
                resolving={resolvingId === note.id}
                onToggleResolved={
                  note.trashed ? undefined : () => void handleToggleResolved(note.id, note.answered)
                }
              />
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
