"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
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
import { searchVaultIndex, searchVaultIndexWhenLocked } from "@/lib/crypto-client/note-search";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
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
  const { index, loading, error } = useVaultIndex(vaultUserId, vaultUnlocked);
  const [filters, setFilters] = useState<NoteFilterState>(defaultNoteFilters);

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

  const notes = useMemo(() => {
    if (!vaultUnlocked || !index) return searchVaultIndexWhenLocked();
    return searchVaultIndex(index, noteFiltersToSearch(filters));
  }, [vaultUnlocked, index, filters]);

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

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description="When you're ready, write your first private note. It stays protected on your device before it is saved."
          action={
            <Link href="/notes/new">
              <Button>Write your first note</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard
                id={note.id}
                title={note.title}
                answered={note.answered}
                createdAt={note.createdAt}
                categoryName={note.categoryName}
                tagNames={note.tagNames}
              />
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
