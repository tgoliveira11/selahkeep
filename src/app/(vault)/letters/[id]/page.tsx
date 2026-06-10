"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { lettersApi } from "@/lib/api-client/letters";
import { encryptLetter, decryptLetter } from "@/lib/crypto-client/letters";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";

export default function LetterDetailPage() {
  const vault = useRequireVault();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [answered, setAnswered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRead = vault.status === "ready" && vault.vaultUnlocked;

  useEffect(() => {
    return subscribeVaultSession(() => {
      setTitle("");
      setBody("");
      setEditing(false);
      setError(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    if (vault.status !== "ready") return;
    const userId = vault.userId;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const letter = await lettersApi.get(id);
        const decrypted = await decryptLetter(
          letter.encryptedTitle,
          letter.encryptedBody,
          letter.encryptedLetterKey
        );
        if (!cancelled) {
          setTitle(decrypted.title);
          setBody(decrypted.body);
          setAnswered(letter.answered);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load letter");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [canRead, vault.status, vault.status === "ready" ? vault.userId : null, id]);

  function handleAccessGranted() {
    vault.recheckVault();
    setLoading(true);
  }

  async function handleSave() {
    if (vault.status !== "ready") return;
    setSaving(true);
    setError(null);
    try {
      const payload = await encryptLetter(vault.userId, id, title, body);
      await lettersApi.update(id, payload);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAnswered() {
    setSaving(true);
    try {
      await lettersApi.update(id, { answered: true });
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this letter? This cannot be undone.")) return;
    try {
      await lettersApi.delete(id);
      router.push("/letters");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  if (vault.status === "loading" || vault.status === "redirecting") {
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

  if (!canRead) {
    return (
      <>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <VaultAccessGate purpose="read" onAccessGranted={handleAccessGranted} />
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12">Loading...</main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {editing ? (
          <div className="space-y-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} />
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-4">{title}</h1>
            <div className="prose whitespace-pre-wrap mb-6">{body}</div>
            {answered && (
              <p className="text-sm text-green-700 mb-4">
                Marked as answered in your journey.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              {!answered && (
                <Button variant="secondary" onClick={handleMarkAnswered} disabled={saving}>
                  Mark as answered
                </Button>
              )}
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-[var(--danger)] text-sm mt-4">{error}</p>}
      </main>
    </>
  );
}
