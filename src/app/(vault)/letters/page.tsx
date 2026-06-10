"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
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
  const [letters, setLetters] = useState<LetterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setLetters([]);
    });
  }, []);

  useEffect(() => {
    if (vault.status !== "ready") return;
    const userId = vault.userId;
    const vaultUnlocked = vault.vaultUnlocked;

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
              title: "Unable to decrypt this letter",
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
  }, [vault.status, vault.status === "ready" ? vault.userId : null, vault.status === "ready" ? vault.vaultUnlocked : null]);

  if (vault.status === "loading" || vault.status === "redirecting" || loading) {
    return (
      <>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12">Loading...</main>
      </>
    );
  }

  if (vault.status === "error") {
    return (
      <>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-[var(--danger)]">{vault.message}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Letters</h1>
          <Link href="/letters/new">
            <Button>Write a letter</Button>
          </Link>
        </div>

        {!vault.vaultUnlocked && letters.length > 0 && (
          <p className="text-sm text-[var(--muted)] mb-4">
            Your vault is locked. Unlock it to read letter titles, or open a letter to unlock.
          </p>
        )}

        {error && <p className="text-[var(--danger)] mb-4">{error}</p>}

        {letters.length === 0 ? (
          <p className="text-[var(--muted)]">No letters yet. Write your first private letter.</p>
        ) : (
          <ul className="space-y-3">
            {letters.map((letter) => (
              <li key={letter.id}>
                <Link
                  href={`/letters/${letter.id}`}
                  className="block p-4 bg-white border border-[var(--border)] rounded-lg hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className={letter.locked ? "font-medium text-[var(--muted)]" : "font-medium"}>
                      {letter.title}
                    </span>
                    {letter.answered && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Answered
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-[var(--muted)]">
                    {new Date(letter.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
