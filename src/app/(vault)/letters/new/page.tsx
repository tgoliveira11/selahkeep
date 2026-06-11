"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { PrivacyNotice } from "@/components/ui/privacy-notice";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { lettersApi } from "@/lib/api-client/letters";
import { encryptLetter } from "@/lib/crypto-client/letters";
import { generateDefaultTitle } from "@/lib/crypto-client/vault";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";

export default function NewLetterPage() {
  const vault = useRequireVault();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canWrite = vault.status === "ready" && vault.vaultUnlocked;

  useEffect(() => {
    return subscribeVaultSession(() => {
      setTitle("");
      setBody("");
      setError(null);
    });
  }, []);

  if (vault.status === "loading" || vault.status === "redirecting") {
    return (
      <PageLayout>
        <LoadingState label="Preparing your writing space" />
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

  if (!canWrite) {
    return (
      <PageLayout>
        <PageHeader title="Write a letter" description="Unlock your vault to begin writing." />
        <Card>
          <VaultAccessGate
            purpose="write"
            onAccessGranted={() => {
              vault.recheckVault();
            }}
          />
        </Card>
      </PageLayout>
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
    <PageLayout>
      <PageHeader
        title="Write a letter"
        description="Take your time. This space is private and calm."
      />

      <Card className="space-y-6">
        <PrivacyNotice compact />

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField id="letter-title" label="Title (optional)" hint="Leave blank to use a date-based title">
            <Input
              id="letter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A title for your letter"
              maxLength={200}
            />
          </FormField>
          <FormField id="letter-body" label="Your letter">
            <Textarea
              id="letter-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Dear God…"
              maxLength={20000}
              required
            />
          </FormField>
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={loading || !body.trim()} className="w-full sm:w-auto">
              {loading ? "Saving securely…" : "Save letter"}
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
}
