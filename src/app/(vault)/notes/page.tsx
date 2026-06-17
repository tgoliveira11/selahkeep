"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { NoteCard } from "@/components/notes/note-card";
import {
  NoteFilters,
  defaultNoteFilters,
  noteFiltersToSearch,
  type NoteFilterState,
} from "@/features/notes/note-filters";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { searchVaultIndex, searchVaultIndexWhenLocked } from "@/lib/crypto-client/note-search";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";

export default function NotesPage() {
  const vault = useRequireVault();
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { index, loading, error } = useVaultIndex(vaultUserId, vaultUnlocked);
  const [filters, setFilters] = useState<NoteFilterState>(defaultNoteFilters);

  useEffect(() => subscribeVaultSession(() => setFilters(defaultNoteFilters)), []);

  const notes = useMemo(() => {
    if (!vaultUnlocked || !index) return searchVaultIndexWhenLocked();
    return searchVaultIndex(index, noteFiltersToSearch(filters));
  }, [vaultUnlocked, index, filters]);

  if (vault.status === "loading" || vault.status === "redirecting" || loading) {
    return (
      <PageLayout>
        <LoadingState label="Loading your notes" />
      </PageLayout>
    );
  }

  if (vault.status === "error") {
    return (
      <PageLayout>
        <ErrorState message={vault.message} />
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

      {!vault.vaultUnlocked && (
        <Alert variant="info" className="mb-6" title="Vault locked">
          Unlock your vault to see note titles and open your notes.
        </Alert>
      )}

      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      {vault.vaultUnlocked && index && (
        <NoteFilters
          filters={filters}
          categories={index.categories.filter((c) => !c.deletedAt)}
          tags={index.tags.filter((t) => !t.deletedAt)}
          onChange={setFilters}
        />
      )}

      {vault.vaultUnlocked && notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description="When you're ready, write your first private note. It stays protected on your device before it is saved."
          action={
            <Link href="/notes/new">
              <Button>Write your first note</Button>
            </Link>
          }
        />
      ) : vault.vaultUnlocked ? (
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
      ) : null}
    </PageLayout>
  );
}
