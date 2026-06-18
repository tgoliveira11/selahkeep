"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { FormField } from "@/components/ui/form-field";
import { NoteCard } from "@/components/notes/note-card";
import {
  NoteFilters,
  defaultNoteFilters,
  hasNoteOrganizers,
  noteFiltersToSearch,
  type NoteFilterState,
} from "@/features/notes/note-filters";
import { NotesVaultIndicator } from "@/features/notes/notes-vault-indicator";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { useNotes } from "@/features/notes/use-notes";
import { searchVaultIndex, searchVaultIndexWhenLocked } from "@/lib/crypto-client/note-search";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { formatNoteCount } from "@/lib/notes/note-count";
import {
  DEFAULT_NOTE_SORT,
  NOTE_SORT_OPTIONS,
  sortNotes,
  type NoteSortOption,
} from "@/lib/notes/note-sort";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { NotesWelcome } from "@/features/vault/notes-welcome";

export default function NotesPage() {
  const vault = useRequireVault();
  const vaultClient = useVaultClientStatus();
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const { index, loading, error, mutateIndex } = useVaultIndex(vaultUserId, vaultUnlocked);
  const { toggleNoteResolved } = useNotes(vaultUserId);
  const [filters, setFilters] = useState<NoteFilterState>(defaultNoteFilters);
  const [sort, setSort] = useState<NoteSortOption>(DEFAULT_NOTE_SORT);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => subscribeVaultSession(() => setFilters(defaultNoteFilters)), []);

  const activeCategories = useMemo(
    () => (index ? index.categories.filter((category) => !category.deletedAt) : []),
    [index]
  );
  const activeTags = useMemo(
    () => (index ? index.tags.filter((tag) => !tag.deletedAt) : []),
    [index]
  );
  const showOrganizerFilters = hasNoteOrganizers(activeCategories, activeTags);

  const allNotes = useMemo(() => {
    if (!vaultUnlocked || !index) return searchVaultIndexWhenLocked();
    return searchVaultIndex(index, {});
  }, [vaultUnlocked, index]);

  const filteredNotes = useMemo(() => {
    if (!vaultUnlocked || !index) return searchVaultIndexWhenLocked();
    return sortNotes(searchVaultIndex(index, noteFiltersToSearch(filters)), sort);
  }, [vaultUnlocked, index, filters, sort]);

  const noteCountLabel = formatNoteCount(filteredNotes.length, allNotes.length);

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
            <NotesVaultIndicator clientStatus={clientStatus} />
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
          <Link href="/notes/new">
            <Button className="w-full sm:w-auto">New note</Button>
          </Link>
        }
      />

      {clientStatus && <NotesVaultIndicator clientStatus={clientStatus} />}

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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-[var(--muted)]" data-testid="notes-counter" aria-live="polite">
            {noteCountLabel}
          </p>
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
      )}

      {vaultUnlocked && index && showOrganizerFilters && (
        <NoteFilters
          filters={filters}
          categories={activeCategories}
          tags={activeTags}
          onChange={setFilters}
        />
      )}

      {vaultUnlocked && index && !showOrganizerFilters && (
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
      ) : (
        <ul className="space-y-3">
          {filteredNotes.map((note) => (
            <li key={note.id}>
              <NoteCard
                id={note.id}
                title={note.title}
                answered={note.answered}
                createdAt={note.createdAt}
                updatedAt={note.updatedAt}
                categoryName={note.categoryName}
                tagNames={note.tagNames}
                resolving={resolvingId === note.id}
                onToggleResolved={() => void handleToggleResolved(note.id, note.answered)}
              />
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
