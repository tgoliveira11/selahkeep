"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { lettersApi } from "@/lib/api-client/letters";
import { encryptLetter } from "@/lib/crypto-client/letters";
import { generateDefaultTitle, isVaultUnlocked } from "@/lib/crypto-client/vault";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";

export default function NewLetterPage() {
  const vault = useRequireVault();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);

  const canWrite =
    vault.status === "ready" && (vault.vaultUnlocked || accessGranted || isVaultUnlocked());

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

  if (!canWrite) {
    return (
      <>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Write a letter</h1>
          <VaultAccessGate
            purpose="write"
            onAccessGranted={() => {
              vault.recheckVault();
              setAccessGranted(true);
            }}
          />
        </main>
      </>
    );
  }

  const userId = vault.userId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const letterId = crypto.randomUUID();
      const finalTitle = title.trim() || generateDefaultTitle();
      const payload = await encryptLetter(userId, letterId, finalTitle, body);
      const letter = await lettersApi.create({ id: letterId, ...payload });
      router.push(`/letters/${letter.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save letter");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Write a letter</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title (optional)</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A title for your letter"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your letter</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Dear God..."
              maxLength={20000}
              required
            />
          </div>
          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading || !body.trim()}>
              {loading ? "Encrypting & saving..." : "Save letter"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}
