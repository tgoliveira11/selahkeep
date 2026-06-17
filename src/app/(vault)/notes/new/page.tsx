"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { PrivacyNotice } from "@/components/ui/privacy-notice";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import { CategoryTagFields } from "@/features/notes/category-tag-fields";
import { useCategoriesTags } from "@/features/notes/use-categories-tags";
import { useNotes } from "@/features/notes/use-notes";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";

export default function NewNotePage() {
  const vault = useRequireVault();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const userId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { createNote, busy, error: notesError } = useNotes(userId);
  const {
    categories,
    tags,
    createCategory,
    createTag,
  } = useCategoriesTags(userId, vaultUnlocked);
  const [error, setError] = useState<string | null>(null);

  const canWrite = vault.status === "ready" && vault.vaultUnlocked;

  useEffect(() => {
    return subscribeVaultSession(() => {
      setTitle("");
      setBody("");
      setCategoryId(null);
      setTagIds([]);
      setAnswered(false);
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
        <PageHeader title="New note" description="Unlock your vault to begin writing." />
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const note = await createNote({ title, body, categoryId, tagIds, answered });
      router.push(`/notes/${note.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    }
  }

  const displayError = error ?? notesError;

  return (
    <PageLayout>
      <PageHeader
        title="New note"
        description="Write in Markdown. Your note is encrypted before it leaves this device."
      />

      <Card className="space-y-6">
        <PrivacyNotice compact />

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField id="note-title" label="Title (optional)" hint="Leave blank to use a date-based title">
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A title for your note"
              maxLength={200}
            />
          </FormField>
          <CategoryTagFields
            categories={categories}
            tags={tags}
            categoryId={categoryId}
            tagIds={tagIds}
            answered={answered}
            onCategoryChange={setCategoryId}
            onTagIdsChange={setTagIds}
            onAnsweredChange={setAnswered}
            onCreateCategory={createCategory}
            onCreateTag={createTag}
          />
          <FormField id="note-body" label="Your note">
            <MarkdownEditor value={body} onChange={setBody} />
          </FormField>
          {displayError && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {displayError}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={busy || !body.trim()} className="w-full sm:w-auto">
              {busy ? "Saving securely…" : "Save note"}
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
