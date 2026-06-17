"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { NoteCard } from "@/components/notes/note-card";
import { vaultApi } from "@/lib/api-client/vault";
import {
  decryptVaultIndex,
  type VaultIndexEntry,
} from "@/lib/crypto-client/vault-index";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";

interface NoteListItem {
  id: string;
  title: string;
  answered: boolean;
  createdAt: string;
  locked: boolean;
}

export default function NotesPage() {
  const vault = useRequireVault();
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setNotes([]);
    });
  }, []);

  useEffect(() => {
    if (!vaultUserId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { encryptedVaultIndex } = await vaultApi.getIndex();
        const items: NoteListItem[] = [];

        if (!vaultUnlocked || !encryptedVaultIndex) {
          if (!cancelled) {
            setNotes([]);
            setLoading(false);
          }
          return;
        }

        const index = await decryptVaultIndex(encryptedVaultIndex);
        const activeEntries = index.entries.filter((e: VaultIndexEntry) => !e.archived);

        for (const entry of activeEntries) {
          items.push({
            id: entry.id,
            title: entry.title,
            answered: entry.answered,
            createdAt: entry.createdAt,
            locked: false,
          });
        }

        if (!cancelled) setNotes(items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load notes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [vaultUserId, vaultUnlocked]);

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
        title="My notes"
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
                locked={note.locked}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </PageLayout>
  );
}
