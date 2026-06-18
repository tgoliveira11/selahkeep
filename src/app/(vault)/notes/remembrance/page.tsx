"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { NoteCard } from "@/components/notes/note-card";
import { NotesVaultProtectedMessage } from "@/features/notes/notes-vault-protected-message";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { filterRemembranceNotes } from "@/lib/notes/remembrance";
import { noteListDisplayProps } from "@/lib/notes/note-list-display";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";

export default function RemembrancePage() {
  const vault = useRequireVault();
  const vaultClient = useVaultClientStatus();
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const { index, loading, error } = useVaultIndex(vaultUserId, vaultUnlocked);

  useEffect(() => subscribeVaultSession(() => {}), []);

  const remembranceNotes = useMemo(
    () => (index ? filterRemembranceNotes(index.entries) : []),
    [index]
  );

  if (vault.status === "loading" || vault.status === "redirecting" || vaultClient.status === "loading" || loading) {
    return (
      <AuthenticatedPage width="notes">
        <LoadingState label="Opening remembrance" />
      </AuthenticatedPage>
    );
  }

  if (vault.status === "error" || vaultClient.status === "error") {
    return (
      <AuthenticatedPage width="notes">
        <ErrorState message="Failed to open remembrance" />
      </AuthenticatedPage>
    );
  }

  if (clientStatus && clientStatus !== "unlocked") {
    return (
      <AuthenticatedPage width="notes">
        <PageHeader
          title="Remembrance"
          description="Things you once carried — resolved reflections to revisit."
        />
        {clientStatus === "locked" && <NotesVaultProtectedMessage />}
      </AuthenticatedPage>
    );
  }

  return (
    <AuthenticatedPage width="notes">
      <div className="mb-6">
        <Link href="/notes" className="text-sm font-medium text-[var(--primary)] hover:underline">
          ← Back to notes
        </Link>
      </div>

      <PageHeader
        title="Remembrance"
        description="Resolved notes with reflections — a quiet place to revisit what you wanted to remember."
      />

      {error && (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      )}

      {remembranceNotes.length === 0 ? (
        <EmptyState
          title="Nothing to revisit yet"
          description="When you mark a note as resolved and save a reflection, it will appear here."
          action={
            <Link href="/notes" className="text-sm font-medium text-[var(--primary)] hover:underline">
              Browse your notes
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="remembrance-list">
          {remembranceNotes.map((note) => (
            <NoteCard
              key={note.id}
              {...noteListDisplayProps(note, index?.categories ?? [], index?.tags ?? [])}
            />
          ))}
        </div>
      )}
    </AuthenticatedPage>
  );
}
