"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import type { EditorStatus } from "@/components/notes/editor-status-bar";
import { NoteFocusModeToggle } from "@/features/notes/note-focus-mode-toggle";
import { CategoryTagFields } from "@/features/notes/category-tag-fields";
import { NoteReadingView } from "@/components/notes/note-reading-view";
import { useNoteVaultBeforeAutoLock } from "@/features/notes/use-note-vault-before-auto-lock";
import { useVaultAutoLockedCopy } from "@/features/vault/use-vault-auto-locked-copy";
import { touchVaultActivity } from "@/features/vault/use-vault-activity";
import { VaultLockedState } from "@/features/vault/vault-locked-state";
import { useCategoriesTags } from "@/features/notes/use-categories-tags";
import { useNotes } from "@/features/notes/use-notes";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { useNoteSearchContext } from "@/features/notes/note-search-context";
import { recordRecentlyViewed } from "@/lib/notes/recently-viewed";
import {
  useAutosaveTimer,
  useConfirmLeave,
  useUnsavedChangesWarning,
} from "@/features/notes/use-unsaved-changes";
import { notesApi } from "@/lib/api-client/notes";
import { ApiError } from "@/lib/api-client/api-error";
import { decryptNote, type NoteMetadataPlaintext } from "@/lib/crypto-client/notes";
import {
  deleteEncryptedNoteDraft,
  loadEncryptedNoteDraft,
  saveEncryptedNoteDraft,
  type NoteDraftPlaintext,
} from "@/lib/crypto-client/note-drafts";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { getCachedNoteBody } from "@/features/notes/eager-decrypt-notes";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { cn } from "@/lib/ui/cn";
import { ResolvedReflectionDialog } from "@/components/notes/resolved-reflection-dialog";
import { NoteNotFoundPanel } from "@/components/layout/app-not-found";

function editSnapshot(metadata: NoteMetadataPlaintext, body: string): string {
  return JSON.stringify({
    title: metadata.title,
    categoryId: metadata.categoryId,
    tagIds: metadata.tagIds,
    answered: metadata.answered,
    body,
  });
}

function NoteDetailPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AuthenticatedPage width="editor" className={className}>
      {children}
    </AuthenticatedPage>
  );
}

export default function NoteDetailPage() {
  const vault = useRequireVault();
  const vaultClient = useVaultClientStatus();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [metadata, setMetadata] = useState<NoteMetadataPlaintext | null>(null);
  const [body, setBody] = useState("");
  const [wrappedKey, setWrappedKey] = useState<EncryptedPayload | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noteMissing, setNoteMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<NoteDraftPlaintext | null>(null);
  const [baseline, setBaseline] = useState("");
  const [checklistSaveState, setChecklistSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const checklistSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLocked = useVaultAutoLockedCopy();

  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const canRead =
    vault.status === "ready" && vault.vaultUnlocked && clientStatus === "unlocked";
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { updateNote, moveNoteToTrash, restoreNoteFromTrash, permanentlyDeleteNote, toggleNoteResolved, resolveNoteWithReflection, toggleNotePinned, toggleNoteFavorite, toggleNoteArchived, duplicateNote, busy, error: notesError } = useNotes(vaultUserId);
  const { mutateIndex } = useVaultIndex(vaultUserId, vaultUnlocked);
  const { query: searchQuery } = useNoteSearchContext();
  const { categories, tags, createCategory, createTag } = useCategoriesTags(vaultUserId, vaultUnlocked);
  const recordedViewRef = useRef<string | null>(null);

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
    setDraftSaved(true);
  }, [body, dirty, id, metadata, vaultUserId]);

  useNoteVaultBeforeAutoLock(dirty, persistDraft);
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
          if (e instanceof ApiError && e.status === 404) {
            setNoteMissing(true);
          } else {
            setError(e instanceof Error ? e.message : "Failed to load note");
          }
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

  useEffect(() => {
    if (!canRead || !metadata || !vaultUserId) return;
    if (recordedViewRef.current === id) return;
    recordedViewRef.current = id;
    void mutateIndex((current) => recordRecentlyViewed(current, id));
  }, [canRead, metadata, vaultUserId, id, mutateIndex]);

  useEffect(() => {
    return () => {
      if (checklistSaveTimer.current) {
        clearTimeout(checklistSaveTimer.current);
      }
    };
  }, []);

  const persistChecklistToggle = useCallback(
    (nextBody: string) => {
      touchVaultActivity();
      if (!metadata || !wrappedKey) return;

      setBody(nextBody);
      setChecklistSaveState("saving");

      if (checklistSaveTimer.current) {
        clearTimeout(checklistSaveTimer.current);
      }

      checklistSaveTimer.current = setTimeout(() => {
        void (async () => {
          try {
            await updateNote(id, metadata, nextBody, wrappedKey);
            const nextMeta = { ...metadata, updatedAt: new Date().toISOString() };
            setMetadata(nextMeta);
            setChecklistSaveState("saved");
            window.setTimeout(() => setChecklistSaveState("idle"), 2000);
          } catch (e) {
            setChecklistSaveState("error");
            setError(e instanceof Error ? e.message : "Failed to save checklist");
          }
        })();
      }, 500);
    },
    [id, metadata, updateNote, wrappedKey]
  );

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
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleMarkResolved() {
    if (!metadata || metadata.answered) return;
    setResolveDialogOpen(true);
  }

  async function handleResolveWithoutReflection() {
    touchVaultActivity();
    if (!metadata || !wrappedKey) return;
    setResolving(true);
    setError(null);
    const previous = metadata;
    try {
      const updated = await resolveNoteWithReflection(id, null);
      setMetadata(updated);
      setBaseline(editSnapshot(updated, body));
      setResolveDialogOpen(false);
    } catch (e) {
      setMetadata(previous);
      setError(e instanceof Error ? e.message : "Failed to resolve");
    } finally {
      setResolving(false);
    }
  }

  async function handleSaveReflectionAndResolve(fields: {
    whatChanged?: string;
    howResolved?: string;
    whatToRemember?: string;
  }) {
    touchVaultActivity();
    if (!metadata || !wrappedKey) return;
    setResolving(true);
    setError(null);
    const previous = metadata;
    try {
      const updated = await resolveNoteWithReflection(id, fields);
      setMetadata(updated);
      setBaseline(editSnapshot(updated, body));
      setResolveDialogOpen(false);
    } catch (e) {
      setMetadata(previous);
      setError(e instanceof Error ? e.message : "Failed to resolve");
    } finally {
      setResolving(false);
    }
  }

  async function handleReopen() {
    touchVaultActivity();
    if (!metadata || !wrappedKey || !metadata.answered) return;
    setResolving(true);
    setError(null);
    const previous = metadata;
    try {
      const updated = await toggleNoteResolved(id, false);
      setMetadata(updated);
      setBaseline(editSnapshot(updated, body));
    } catch (e) {
      setMetadata(previous);
      setError(e instanceof Error ? e.message : "Failed to reopen");
    } finally {
      setResolving(false);
    }
  }

  async function handleToggleResolved() {
    touchVaultActivity();
    if (!metadata || !wrappedKey) return;
    setResolving(true);
    setError(null);
    const nextAnswered = !metadata.answered;
    const previous = metadata;
    setMetadata({ ...metadata, answered: nextAnswered });
    try {
      const updated = await toggleNoteResolved(id, nextAnswered);
      setMetadata(updated);
      setBaseline(editSnapshot(updated, body));
    } catch (e) {
      setMetadata(previous);
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setResolving(false);
    }
  }

  async function handleMoveToTrash() {
    setError(null);
    try {
      if (vaultUserId) {
        await deleteEncryptedNoteDraft(vaultUserId, id);
      }
      await moveNoteToTrash(id);
      router.push("/notes?filter=trash");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to move note to trash");
      setDeleteOpen(false);
    }
  }

  async function handleRestoreFromTrash() {
    setError(null);
    try {
      await restoreNoteFromTrash(id);
      setMetadata((current) =>
        current ? { ...current, trashed: false, trashedAt: null } : current
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore note");
    }
  }

  async function handlePermanentDelete() {
    setError(null);
    try {
      if (vaultUserId) {
        await deleteEncryptedNoteDraft(vaultUserId, id);
      }
      await permanentlyDeleteNote(id);
      router.push("/notes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete note");
      setPermanentDeleteOpen(false);
    }
  }

  async function handleDuplicate() {
    setError(null);
    try {
      const { noteId } = await duplicateNote(id);
      router.push(`/notes/${noteId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to duplicate note");
    }
  }

  if (
    vault.status === "loading" ||
    vault.status === "redirecting" ||
    vaultClient.status === "loading"
  ) {
    return (
      <NoteDetailPageShell>
        <LoadingState label="Opening your note" />
      </NoteDetailPageShell>
    );
  }

  if (vault.status === "error" || vaultClient.status === "error") {
    return (
      <NoteDetailPageShell>
        <ErrorState
          message={
            vault.status === "error"
              ? vault.message
              : vaultClient.status === "error"
                ? vaultClient.message
                : "Failed to open note"
          }
        />
      </NoteDetailPageShell>
    );
  }

  const backLink = (
    <div className="mb-6">
      <button
        type="button"
        className="text-sm font-medium text-[var(--primary)] hover:underline"
        onClick={() => requestLeave(() => router.push("/notes"))}
      >
        ← Back to notes
      </button>
    </div>
  );

  if (clientStatus && clientStatus !== "unlocked") {
    return (
      <NoteDetailPageShell>
        {backLink}
        {clientStatus === "locked" ? (
          <VaultLockedState
            variant={editing ? "write" : "read-note"}
            autoLocked={autoLocked}
            returnTo={`/notes/${id}`}
          />
        ) : null}
      </NoteDetailPageShell>
    );
  }

  if (!canRead) {
    return (
      <NoteDetailPageShell>
        {backLink}
        <VaultLockedState variant="read-note" returnTo={`/notes/${id}`} />
      </NoteDetailPageShell>
    );
  }

  if (noteMissing) {
    return <NoteNotFoundPanel />;
  }

  if (loading || !metadata) {
    return (
      <NoteDetailPageShell>
        {backLink}
        <LoadingState label="Opening your note" />
      </NoteDetailPageShell>
    );
  }

  const displayError = error ?? notesError;

  const editorStatus: EditorStatus = busy
    ? "saving"
    : displayError && dirty
      ? "save-failed"
      : savedFlash
        ? "saved"
        : dirty
          ? "unsaved"
          : draftSaved
            ? "draft-saved"
            : "idle";

  return (
    <NoteDetailPageShell className={cn(editing && focusMode && "note-page--focus")}>
      {backLink}

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            {dirty ? (
              <p className="text-sm text-[var(--muted)]" role="status">
                You have unsaved changes.
              </p>
            ) : (
              <span />
            )}
            <NoteFocusModeToggle active={focusMode} onToggle={() => setFocusMode((v) => !v)} />
          </div>
          <FormField id="edit-title" label="Title">
            <Input
              id="edit-title"
              value={metadata.title}
              onChange={(e) => {
                touchVaultActivity();
                setMetadata({ ...metadata, title: e.target.value });
              }}
              maxLength={200}
            />
          </FormField>
          <div className={cn(focusMode && "note-focus-hide")}>
            <CategoryTagFields
              mode="edit"
              categories={categories}
              tags={tags}
              categoryId={metadata.categoryId}
              tagIds={metadata.tagIds}
              answered={metadata.answered}
              onCategoryChange={(categoryId) => {
                touchVaultActivity();
                setMetadata({ ...metadata, categoryId });
              }}
              onTagIdsChange={(tagIds) => {
                touchVaultActivity();
                setMetadata({ ...metadata, tagIds });
              }}
              onAnsweredChange={(answered) => {
                touchVaultActivity();
                setMetadata({ ...metadata, answered });
              }}
              onCreateCategory={createCategory}
              onCreateTag={createTag}
            />
          </div>
          <FormField id="edit-body" label="Your note">
            <MarkdownEditor
              value={body}
              onChange={setBody}
              id="edit-note-markdown"
              onSave={() => void handleSave()}
              checklistsDisabled={busy}
              status={editorStatus}
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
        <NoteReadingView
          metadata={metadata}
          body={body}
          categories={categories}
          tags={tags}
          busy={busy}
          resolving={resolving}
          checklistSaveState={checklistSaveState}
          onEdit={startEditing}
          onToggleResolved={() => void handleToggleResolved()}
          onMarkResolved={() => void handleMarkResolved()}
          onReopen={() => void handleReopen()}
          onTogglePinned={() => void toggleNotePinned(id, !metadata.pinned).then(setMetadata)}
          onToggleFavorite={() => void toggleNoteFavorite(id, !metadata.favorite).then(setMetadata)}
          onToggleArchived={() => void toggleNoteArchived(id, !metadata.archived).then(setMetadata)}
          onDuplicate={() => void handleDuplicate()}
          onMoveToTrash={() => setDeleteOpen(true)}
          onRestoreFromTrash={() => void handleRestoreFromTrash()}
          onPermanentDelete={() => setPermanentDeleteOpen(true)}
          onChecklistChange={persistChecklistToggle}
          searchQuery={searchQuery}
        />
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
        title="Move note to trash?"
        description="You can restore this note from Trash later."
        confirmLabel="Move to trash"
        loading={busy}
        onConfirm={handleMoveToTrash}
        onCancel={() => setDeleteOpen(false)}
      />
      <ConfirmDialog
        open={permanentDeleteOpen}
        title="Delete permanently?"
        description="This will permanently delete this encrypted note. This action cannot be undone."
        confirmLabel="Delete permanently"
        loading={busy}
        onConfirm={handlePermanentDelete}
        onCancel={() => setPermanentDeleteOpen(false)}
      />
      {confirmDialog}

      <ResolvedReflectionDialog
        key={resolveDialogOpen ? "open" : "closed"}
        open={resolveDialogOpen}
        loading={resolving || busy}
        onSaveAndResolve={(fields) => void handleSaveReflectionAndResolve(fields)}
        onResolveWithoutReflection={() => void handleResolveWithoutReflection()}
        onCancel={() => setResolveDialogOpen(false)}
      />
    </NoteDetailPageShell>
  );
}
