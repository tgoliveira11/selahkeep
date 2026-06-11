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
import { LetterCard } from "@/components/letters/letter-card";
import { lettersApi } from "@/lib/api-client/letters";
import { decryptLetter } from "@/lib/crypto-client/letters";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";

interface LetterListItem {
  id: string;
  title: string;
  answered: boolean;
  createdAt: string;
  locked: boolean;
}

export default function LettersPage() {
  const vault = useRequireVault();
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const [letters, setLetters] = useState<LetterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setLetters([]);
    });
  }, []);

  useEffect(() => {
    if (!vaultUserId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const encrypted = await lettersApi.list();
        const items: LetterListItem[] = [];

        for (const letter of encrypted) {
          if (!vaultUnlocked) {
            items.push({
              id: letter.id,
              title: "Private letter",
              answered: letter.answered,
              createdAt: letter.createdAt,
              locked: true,
            });
            continue;
          }

          try {
            const { title } = await decryptLetter(
              letter.encryptedTitle,
              letter.encryptedBody,
              letter.encryptedLetterKey
            );
            items.push({
              id: letter.id,
              title,
              answered: letter.answered,
              createdAt: letter.createdAt,
              locked: false,
            });
          } catch {
            items.push({
              id: letter.id,
              title: "Unable to open this letter",
              answered: letter.answered,
              createdAt: letter.createdAt,
              locked: false,
            });
          }
        }

        if (!cancelled) setLetters(items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load letters");
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
        <LoadingState label="Loading your letters" />
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
        title="My letters"
        description="A private collection of your letters — not a feed, not shared with anyone."
        action={
          <Link href="/letters/new">
            <Button className="w-full sm:w-auto">Write a letter</Button>
          </Link>
        }
      />

      {!vault.vaultUnlocked && letters.length > 0 && (
        <Alert variant="info" className="mb-6" title="Vault locked">
          Letter titles are hidden while your vault is locked. Unlock to read titles, or open a letter
          to unlock and read it.
        </Alert>
      )}

      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      {letters.length === 0 ? (
        <EmptyState
          title="No letters yet"
          description="When you're ready, write your first private letter. It stays protected on your device before it is saved."
          action={
            <Link href="/letters/new">
              <Button>Write your first letter</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {letters.map((letter) => (
            <li key={letter.id}>
              <LetterCard
                id={letter.id}
                title={letter.title}
                answered={letter.answered}
                createdAt={letter.createdAt}
                locked={letter.locked}
              />
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
