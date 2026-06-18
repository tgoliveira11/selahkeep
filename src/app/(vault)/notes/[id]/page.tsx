"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { useCategoriesTags } from "@/features/notes/use-categories-tags";
import { useNotes } from "@/features/notes/use-notes";
import {
  useAutosaveTimer,
  useConfirmLeave,
  useUnsavedChangesWarning,
} from "@/features/notes/use-unsaved-changes";
import { notesApi } from "@/lib/api-client/notes";
import { decryptNote, type NoteMetadataPlaintext } from "@/lib/crypto-client/notes";
import {
  deleteEncryptedNoteDraft,
  loadEncryptedNoteDraft,
  saveEncryptedNoteDraft,
  type NoteDraftPlaintext,
} from "@/lib/crypto-client/note-drafts";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { RESOLVED_COPY, isNoteResolved } from "@/lib/notes/resolved-labels";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";
import { getCachedNoteBody } from "@/features/notes/eager-decrypt-notes";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

function editSnapshot(metadata: NoteMetadataPlaintext, body: string): string {
  return JSON.stringify({
    title: metadata.title,
    categoryId: metadata.categoryId,
    tagIds: metadata.tagIds,
    answered: metadata.answered,
    body,
  });
}

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
  const [draftPrompt, setDraftPrompt] = useState<NoteDraftPlaintext | null>(null);
  const [baseline, setBaseline] = useState("");

  const canRead = vault.status === "ready" && vault.vaultUnlocked;
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { updateNote, deleteNote, busy, error: notesError } = useNotes(vaultUserId);
  const { categories, tags, createCategory, createTag } = useCategoriesTags(vaultUserId, vaultUnlocked);

  const editSnapshotValue = useMemo(
    () => (metadata ? editSnapshot(metadata, body) : ""),
    [metadata, body]
  );
  const dirty = editing && editSnapshotValue !== baseline;
  useUnsavedChangesWarning(dirty);
  const { requestLeave, confirmDialog } = useConfirmLeave(dirty);

  const persistDraft = useCallback(async () => {
    if (!vaultUserId || !metadata || !dirty) return;
    const draft: NoteDraftPlaintext = {
      title: metadata.title,
      body,
      categoryId: metadata.categoryId,
      tagIds: metadata.tagIds,
      answered: metadata.answered,
      updatedAt: new Date().toISOString(),
    };
    await saveEncryptedNoteDraft(vaultUserId, id, draft);
  }, [body, dirty, id, metadata, vaultUserId]);

  useAutosaveTimer(Boolean(vaultUserId && editing && dirty), persistDraft);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setMetadata(null);
      setBody("");
      setWrappedKey(null);
      setEditing(false);
      setError(null);
      setLoading(false);
      setDraftPrompt(null);
      setBaseline("");
    });
  }, []);

  useEffect(() => {
    if (!canRead || !vaultUserId) return;
    const userId = vaultUserId;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const note = await notesApi.get(id);
        const cachedBody = getCachedNoteBody(id);
        let decrypted;
        if (cachedBody) {
          decrypted = await decryptNote(
            note.encryptedMetadata,
            note.encryptedBody,
            note.encryptedWrappedNoteKey
          );
          if (!cancelled) {
            setMetadata(decrypted.metadata);
            setBody(cachedBody);
            setWrappedKey(note.encryptedWrappedNoteKey);
          }
        } else {
          decrypted = await decryptNote(
            note.encryptedMetadata,
            note.encryptedBody,
            note.encryptedWrappedNoteKey
          );
          if (!cancelled) {
            setMetadata(decrypted.metadata);
            setBody(decrypted.body);
            setWrappedKey(note.encryptedWrappedNoteKey);
          }
        }

        const draft = await loadEncryptedNoteDraft(userId, id);
        if (!cancelled && draft) {
          setDraftPrompt(draft);
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

  function startEditing() {
    if (!metadata) return;
    setBaseline(editSnapshot(metadata, body));
    setEditing(true);
  }

  function cancelEditing() {
    if (!metadata) return;
    const snap = JSON.parse(baseline) as {
      title: string;
      categoryId: string | null;
      tagIds: string[];
      answered: boolean;
      body: string;
    };
    setMetadata({
      ...metadata,
      title: snap.title,
      categoryId: snap.categoryId,
      tagIds: snap.tagIds,
      answered: snap.answered,
    });
    setBody(snap.body);
    setEditing(false);
  }

  function restoreDraft() {
    if (!draftPrompt || !metadata) return;
    setMetadata({
      ...metadata,
      title: draftPrompt.title,
      categoryId: draftPrompt.categoryId,
      tagIds: draftPrompt.tagIds,
      answered: draftPrompt.answered,
    });
    setBody(draftPrompt.body);
    setDraftPrompt(null);
    setEditing(true);
    setBaseline(
      editSnapshot(
        {
          ...metadata,
          title: draftPrompt.title,
          categoryId: draftPrompt.categoryId,
          tagIds: draftPrompt.tagIds,
          answered: draftPrompt.answered,
        },
        draftPrompt.body
      )
    );
  }

  async function discardDraft() {
    if (vaultUserId) {
      await deleteEncryptedNoteDraft(vaultUserId, id);
    }
    setDraftPrompt(null);
  }

  async function handleSave() {
    if (!metadata || !wrappedKey) return;
    setError(null);
    try {
      await updateNote(id, metadata, body, wrappedKey);
      const nextMeta = { ...metadata, updatedAt: new Date().toISOString() };
      setMetadata(nextMeta);
      setBaseline(editSnapshot(nextMeta, body));
      if (vaultUserId) {
        await deleteEncryptedNoteDraft(vaultUserId, id);
      }
      setDraftPrompt(null);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleMarkResolved() {
    if (!metadata || !wrappedKey) return;
    setError(null);
    try {
      const next = { ...metadata, answered: true, updatedAt: new Date().toISOString() };
      await updateNote(id, next, body, wrappedKey);
      setMetadata(next);
      setBaseline(editSnapshot(next, body));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      if (vaultUserId) {
        await deleteEncryptedNoteDraft(vaultUserId, id);
      }
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

  const displayError = error ?? notesError;

  return (
    <PageLayout>
      <div className="mb-6">
        <button
          type="button"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
          onClick={() => requestLeave(() => router.push("/notes"))}
        >
          ← Back to my notes
        </button>
      </div>

      {draftPrompt && !editing && (
        <Alert variant="info" role="status" className="mb-4">
          <p className="font-medium">Unsaved draft found</p>
          <p className="mt-1 text-sm">You have unsaved changes saved on this device.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={restoreDraft}>
              Restore draft
            </Button>
            <Button type="button" variant="secondary" onClick={() => void discardDraft()}>
              Discard draft
            </Button>
          </div>
        </Alert>
      )}

      {editing ? (
        <Card className="space-y-5">
          {dirty && (
            <p className="text-sm text-[var(--muted)]" role="status">
              You have unsaved changes.
            </p>
          )}
          <FormField id="edit-title" label="Title">
            <Input
              id="edit-title"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              maxLength={200}
            />
          </FormField>
          <CategoryTagFields
            mode="edit"
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
            <MarkdownEditor
              value={body}
              onChange={setBody}
              id="edit-note-markdown"
              onSave={() => void handleSave()}
            />
          </FormField>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => void handleSave()} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => requestLeave(cancelEditing)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <article className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{metadata.title}</h1>
              {isNoteResolved(metadata.answered) && (
                <Badge variant="success">{RESOLVED_COPY.resolvedBadge}</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {metadata.categoryId && (
                <NoteCategoryLabel
                  name={
                    categories.find((category) => category.id === metadata.categoryId)?.name ??
                    "Category"
                  }
                />
              )}
              {metadata.tagIds.map((tagId) => {
                const tag = tags.find((item) => item.id === tagId);
                return tag ? <NoteTagChip key={tagId} name={tag.name} /> : null;
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
            <MarkdownPreview markdown={body} className="text-base leading-relaxed text-[var(--foreground)]" />
          </Card>

          {isNoteResolved(metadata.answered) && (
            <SuccessState message={RESOLVED_COPY.resolvedSuccess} />
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button variant="secondary" onClick={startEditing}>
              Edit
            </Button>
            {!isNoteResolved(metadata.answered) && (
              <Button variant="secondary" onClick={() => void handleMarkResolved()} disabled={busy}>
                {RESOLVED_COPY.markResolved}
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
      {confirmDialog}
    </PageLayout>
  );
}
