"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { SuccessState } from "@/components/ui/success-state";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import { CategoryTagFields } from "@/features/notes/category-tag-fields";
import { useCategoriesTags } from "@/features/notes/use-categories-tags";
import { renderSanitizedMarkdown } from "@/features/notes/sanitize-markdown";
import { useNotes } from "@/features/notes/use-notes";
import { notesApi } from "@/lib/api-client/notes";
import { decryptNote, type NoteMetadataPlaintext } from "@/lib/crypto-client/notes";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";
import { getCachedNoteBody } from "@/features/notes/eager-decrypt-notes";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export default function NoteDetailPage() {
  const vault = useRequireVault();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [metadata, setMetadata] = useState<NoteMetadataPlaintext | null>(null);
  const [body, setBody] = useState("");
  const [wrappedKey, setWrappedKey] = useState<EncryptedPayload | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canRead = vault.status === "ready" && vault.vaultUnlocked;
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { updateNote, deleteNote, busy, error: notesError } = useNotes(vaultUserId);
  const { categories, tags, createCategory, createTag } = useCategoriesTags(vaultUserId, vaultUnlocked);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setMetadata(null);
      setBody("");
      setWrappedKey(null);
      setEditing(false);
      setError(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!canRead || !vaultUserId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const note = await notesApi.get(id);
        const cachedBody = getCachedNoteBody(id);
        if (cachedBody) {
          const decrypted = await decryptNote(
            note.encryptedMetadata,
            note.encryptedBody,
            note.encryptedWrappedNoteKey
          );
          if (!cancelled) {
            setMetadata(decrypted.metadata);
            setBody(cachedBody);
            setWrappedKey(note.encryptedWrappedNoteKey);
          }
          return;
        }

        const decrypted = await decryptNote(
          note.encryptedMetadata,
          note.encryptedBody,
          note.encryptedWrappedNoteKey
        );
        if (!cancelled) {
          setMetadata(decrypted.metadata);
          setBody(decrypted.body);
          setWrappedKey(note.encryptedWrappedNoteKey);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load note");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [canRead, vaultUserId, id]);

  function handleAccessGranted() {
    vault.recheckVault();
    setLoading(true);
  }

  async function handleSave() {
    if (!metadata || !wrappedKey) return;
    setError(null);
    try {
      await updateNote(id, metadata, body, wrappedKey);
      setMetadata((m) => (m ? { ...m, updatedAt: new Date().toISOString() } : m));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleMarkAnswered() {
    if (!metadata || !wrappedKey) return;
    setError(null);
    try {
      const next = { ...metadata, answered: true, updatedAt: new Date().toISOString() };
      await updateNote(id, next, body, wrappedKey);
      setMetadata(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteNote(id);
      router.push("/notes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleteOpen(false);
    }
  }

  if (vault.status === "loading" || vault.status === "redirecting") {
    return (
      <PageLayout>
        <LoadingState label="Opening your note" />
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

  if (!canRead) {
    return (
      <PageLayout>
        <Card>
          <VaultAccessGate purpose="read" onAccessGranted={handleAccessGranted} />
        </Card>
      </PageLayout>
    );
  }

  if (loading || !metadata) {
    return (
      <PageLayout>
        <LoadingState label="Opening your note" />
      </PageLayout>
    );
  }

  const previewHtml = renderSanitizedMarkdown(body);
  const displayError = error ?? notesError;

  return (
    <PageLayout>
      <div className="mb-6">
        <Link href="/notes" className="text-sm font-medium text-[var(--primary)] hover:underline">
          ← Back to my notes
        </Link>
      </div>

      {editing ? (
        <Card className="space-y-5">
          <FormField id="edit-title" label="Title">
            <Input
              id="edit-title"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              maxLength={200}
            />
          </FormField>
          <CategoryTagFields
            categories={categories}
            tags={tags}
            categoryId={metadata.categoryId}
            tagIds={metadata.tagIds}
            answered={metadata.answered}
            onCategoryChange={(categoryId) => setMetadata({ ...metadata, categoryId })}
            onTagIdsChange={(tagIds) => setMetadata({ ...metadata, tagIds })}
            onAnsweredChange={(answered) => setMetadata({ ...metadata, answered })}
            onCreateCategory={createCategory}
            onCreateTag={createTag}
          />
          <FormField id="edit-body" label="Your note">
            <MarkdownEditor value={body} onChange={setBody} id="edit-note-markdown" />
          </FormField>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <article className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{metadata.title}</h1>
              {metadata.answered && <Badge variant="success">Answered</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              {metadata.categoryId && (
                <Badge variant="muted">
                  {categories.find((c) => c.id === metadata.categoryId)?.name ?? "Category"}
                </Badge>
              )}
              {metadata.tagIds.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                return tag ? (
                  <Badge key={tagId} variant="muted">
                    {tag.name}
                  </Badge>
                ) : null;
              })}
            </div>
            <p className="text-sm text-[var(--muted)]">
              Updated{" "}
              {new Date(metadata.updatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </header>

          <Card muted className="p-6">
            <div
              className="prose-note text-base leading-relaxed text-[var(--foreground)]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </Card>

          {metadata.answered && (
            <SuccessState message="You marked this note as answered in your journey." />
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {!metadata.answered && (
              <Button variant="secondary" onClick={handleMarkAnswered} disabled={busy}>
                Mark as answered
              </Button>
            )}
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete note
            </Button>
          </div>
        </article>
      )}

      {displayError && (
        <div className="mt-4">
          <Alert variant="danger" role="alert">
            {displayError}
          </Alert>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this note?"
        description="This removes the note from your vault. You can recover access only if you have backups."
        confirmLabel="Delete note"
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageLayout>
  );
}
