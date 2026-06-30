"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNoteDate } from "@/lib/notes/note-dates";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import type { EditorStatus } from "@/components/notes/editor-status-bar";
import { NoteFocusModeToggle } from "@/features/notes/note-focus-mode-toggle";
import { NoteReadingView } from "@/components/notes/note-reading-view";
import { NoteCategoryField } from "@/features/notes/category-tag-fields";
import { TagChipInput } from "@/features/notes/tag-chip-input";
import { NoteAttachmentsField } from "@/features/notes/note-attachments-field";
import {
  getLockedCategoryDisplayName,
  isTemplateLockedCategory,
} from "@/lib/notes/edit-template-category";
import { filterUserCreatedCategories } from "@/lib/notes/template-category";
import { NoteVersionHistory } from "@/components/notes/note-version-history";
import { NoteVersionHistoryRail } from "@/components/notes/note-version-history-rail";
import { NoteAttachmentsRail } from "@/components/notes/note-attachments-rail";
import { NoteDetailActionBar } from "@/components/notes/note-detail-action-bar";
import type { DecryptedNoteVersion } from "@/lib/crypto-client/note-versions";
import { appendTranscript } from "@/lib/voice/transcript-format";
import { isVoiceNotesEnabled } from "@/lib/voice/voice-config";
import { shouldDeferVoiceModelLoad } from "@/features/voice/transcription-worker-client";
import { NoteEditorPausedForVoice } from "@/features/voice/note-editor-paused-for-voice";
import { DictateButton } from "@/features/voice/dictate-button";
import { AudioUploadButton } from "@/features/voice/audio-upload-button";
import { useOnlineStatus } from "@/features/notes/use-online-status";

const VoiceCapturePanel = dynamic(
  () => import("@/features/voice/voice-capture-panel").then((m) => m.VoiceCapturePanel),
  { ssr: false }
);

const AudioUploadPanel = dynamic(
  () => import("@/features/voice/audio-upload-panel").then((m) => m.AudioUploadPanel),
  { ssr: false }
);
import { useNoteVaultBeforeAutoLock } from "@/features/notes/use-note-vault-before-auto-lock";
import { useVaultAutoLockedCopy } from "@/features/vault/use-vault-auto-locked-copy";
import { touchVaultActivity } from "@/features/vault/use-vault-activity";
import { VaultLockedState } from "@/features/vault/vault-locked-state";
import { useCategoriesTags } from "@/features/notes/use-categories-tags";
import { useNotes } from "@/features/notes/use-notes";
import { useKanban } from "@/features/notes/use-kanban";
import { useKanbanNoteToBoardSync } from "@/features/notes/use-kanban-note-to-board-sync";
import { isKanbanEnabled } from "@/lib/notes/kanban-config";
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
import { GenerateFromNotePanel } from "@/features/kanban/generate-panel";
import { getKanbanProgress } from "@/lib/notes/kanban-progress";
import { recognizeKanbanActivities } from "@/lib/notes/kanban-from-note";

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
    <AuthenticatedPage width="notes" className={className}>
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
  const [zenMode, setZenMode] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const [versionCompareOpen, setVersionCompareOpen] = useState(false);
  const [versionCount, setVersionCount] = useState<number | null>(null);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const voiceEnabled = isVoiceNotesEnabled();
  const pauseEditorForVoice =
    shouldDeferVoiceModelLoad() && (voiceOpen || uploadOpen);
  const online = useOnlineStatus();
  const checklistSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLocked = useVaultAutoLockedCopy();

  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const canRead =
    vault.status === "ready" && vault.vaultUnlocked && clientStatus === "unlocked";
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { updateNote, moveNoteToTrash, restoreNoteFromTrash, permanentlyDeleteNote, toggleNoteResolved, resolveNoteWithReflection, toggleNotePinned, toggleNoteFavorite, toggleNoteArchived, duplicateNote, busy, error: notesError } = useNotes(vaultUserId);
  const {
    board: kanbanBoard,
    encryptedWrappedKey: kanbanWrappedKey,
    loading: kanbanLoading,
    saving: kanbanSaving,
    error: kanbanError,
    loadBoardForNote,
    createNoteBoard,
    regenerateFromNote,
    saveBoard: saveKanbanBoard,
  } = useKanban(vaultUserId);
  useKanbanNoteToBoardSync({
    body,
    board: kanbanBoard,
    enabled: isKanbanEnabled() && Boolean(kanbanBoard?.scope === "note"),
    encryptedWrappedKey: kanbanWrappedKey,
    saveBoard: saveKanbanBoard,
  });
  const { mutateIndex } = useVaultIndex(vaultUserId, vaultUnlocked);
  const { query: searchQuery } = useNoteSearchContext();
  const { categories, tags, createCategory, createTag } = useCategoriesTags(vaultUserId, vaultUnlocked);
  const userCategories = useMemo(
    () => filterUserCreatedCategories(categories),
    [categories]
  );
  const categoryLocked = metadata
    ? isTemplateLockedCategory(metadata.categoryId, categories)
    : false;
  const lockedCategoryName = metadata
    ? getLockedCategoryDisplayName(metadata.categoryId, categories)
    : null;
  const recordedViewRef = useRef<string | null>(null);
  const recognizedKanbanActivities = useMemo(
    () => recognizeKanbanActivities(body),
    [body]
  );
  const kanbanProgress = useMemo(
    () => (kanbanBoard ? getKanbanProgress(kanbanBoard) : null),
    [kanbanBoard]
  );

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
    if (!canRead || !metadata || !vaultUserId) return;
    void loadBoardForNote(id).catch(() => {
      // Optional surface: note reading should still work if kanban is unavailable.
    });
  }, [canRead, metadata, vaultUserId, id, loadBoardForNote]);

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
            setVersionRefreshKey((k) => k + 1);
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
      setVersionRefreshKey((k) => k + 1);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleRestoreVersion(content: DecryptedNoteVersion) {
    if (!metadata || !wrappedKey) return;
    setError(null);
    setRestoringVersion(true);
    try {
      const restoredMetadata: NoteMetadataPlaintext = {
        ...metadata,
        title: content.metadata.title,
        categoryId: content.metadata.categoryId,
        tagIds: content.metadata.tagIds,
        answered: content.metadata.answered,
      };
      await updateNote(id, restoredMetadata, content.body, wrappedKey);
      const nextMeta = { ...restoredMetadata, updatedAt: new Date().toISOString() };
      setMetadata(nextMeta);
      setBody(content.body);
      setBaseline(editSnapshot(nextMeta, content.body));
      setVersionRefreshKey((k) => k + 1);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore version");
      throw e;
    } finally {
      setRestoringVersion(false);
    }
  }

  async function handleCreateKanbanBoard() {
    touchVaultActivity();
    if (!metadata || !wrappedKey) return;
    setError(null);
    try {
      const board = await createNoteBoard(id, metadata.title, body, wrappedKey);
      router.push(`/kanban/${board.boardId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create kanban board");
    }
  }

  async function handleResyncKanbanBoard() {
    touchVaultActivity();
    setError(null);
    try {
      await regenerateFromNote(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to re-sync kanban board");
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
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      onClick={() => requestLeave(() => router.push("/notes"))}
      data-testid="note-back-link"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back to notes
    </button>
  );

  if (clientStatus && clientStatus !== "unlocked") {
    return (
      <NoteDetailPageShell>
        <div className="mb-6">{backLink}</div>
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
        <div className="mb-6">{backLink}</div>
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
        <div className="mb-6">{backLink}</div>
        <LoadingState label="Opening your note" />
      </NoteDetailPageShell>
    );
  }

  // Zen mode: a distraction-free reading surface (no chrome, no history).
  if (!editing && zenMode && metadata) {
    return (
      <NoteDetailPageShell className="note-page--focus">
        <NoteReadingView
          metadata={metadata}
          body={body}
          categories={categories}
          tags={tags}
          checklistSaveState={checklistSaveState}
          onEdit={startEditing}
          onToggleResolved={() => void handleToggleResolved()}
          onTogglePinned={() => {}}
          onToggleFavorite={() => {}}
          onToggleArchived={() => {}}
          onDuplicate={() => {}}
          onMoveToTrash={() => {}}
          onRestoreFromTrash={() => {}}
          onPermanentDelete={() => {}}
          onChecklistChange={persistChecklistToggle}
          zen
          onExitZen={() => setZenMode(false)}
        />
      </NoteDetailPageShell>
    );
  }

  const displayError = error ?? notesError;

  const editorStatus: EditorStatus = busy
    ? "saving"
    : !online && dirty
      ? "offline"
      : displayError && dirty
        ? "save-failed"
        : savedFlash
          ? "saved"
          : dirty
            ? "unsaved"
            : draftSaved
              ? "draft-saved"
              : "idle";

  const editStatusLabel =
    editorStatus === "saving"
      ? "Saving…"
      : editorStatus === "offline"
        ? "Offline — saved on device"
        : editorStatus === "save-failed"
          ? "Save failed"
          : editorStatus === "saved"
            ? "Saved"
            : editorStatus === "unsaved"
              ? "Unsaved changes"
              : editorStatus === "draft-saved"
                ? "Draft saved"
                : null;

  return (
    <NoteDetailPageShell className={cn(editing && focusMode && "note-page--focus")}>
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
        <>
          <div className="mb-6">{backLink}</div>
        <Card className="space-y-5">
          <div
            className="flex flex-wrap items-center justify-between gap-3"
            data-testid="note-editor-topbar"
          >
            <Button variant="secondary" onClick={() => requestLeave(cancelEditing)}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              {editStatusLabel && (
                <span
                  className={cn(
                    "text-[13px] font-medium tabular-nums",
                    editorStatus === "save-failed"
                      ? "text-[var(--danger)]"
                      : editorStatus === "saved" || editorStatus === "draft-saved"
                        ? "text-[var(--success)]"
                        : "text-[var(--muted)]"
                  )}
                  role="status"
                  data-testid="note-editor-topbar-status"
                >
                  {editStatusLabel}
                </span>
              )}
              <NoteFocusModeToggle active={focusMode} onToggle={() => setFocusMode((v) => !v)} />
              <Button onClick={() => void handleSave()} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
          <div>
            <input
              id="edit-title"
              aria-label="Title"
              value={metadata.title}
              onChange={(e) => {
                touchVaultActivity();
                setMetadata({ ...metadata, title: e.target.value });
              }}
              maxLength={200}
              className="w-full border-0 bg-transparent px-0 py-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
            />
          </div>

          <div
            className={cn(focusMode && "note-focus-hide")}
            data-testid="edit-note-category-section"
          >
            <NoteCategoryField
              categories={categoryLocked ? [] : userCategories}
              categoryId={metadata.categoryId}
              categoryLocked={categoryLocked}
              lockedCategoryName={lockedCategoryName}
              onCategoryChange={(categoryId) => {
                touchVaultActivity();
                setMetadata({ ...metadata, categoryId });
              }}
              onCreateCategory={categoryLocked ? undefined : createCategory}
            />
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={metadata.answered}
                onChange={(e) => {
                  touchVaultActivity();
                  setMetadata({ ...metadata, answered: e.target.checked });
                }}
                aria-label="Mark as resolved"
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              Mark as resolved
            </label>
          </div>

          <FormField id="edit-body" label="Your note">
            {voiceEnabled && (
              <div className={cn("mb-3", focusMode && "note-focus-hide")}>
                {voiceOpen ? (
                  <VoiceCapturePanel
                    onClose={() => setVoiceOpen(false)}
                    onInsert={(text) => {
                      touchVaultActivity();
                      setBody((current) => appendTranscript(current, text));
                    }}
                  />
                ) : uploadOpen ? (
                  <AudioUploadPanel
                    onClose={() => setUploadOpen(false)}
                    onInsert={(text) => {
                      touchVaultActivity();
                      setBody((current) => appendTranscript(current, text));
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <DictateButton
                      onClick={() => {
                        setUploadOpen(false);
                        setVoiceOpen(true);
                      }}
                      testId="edit-note-dictate"
                    />
                    <AudioUploadButton
                      onClick={() => {
                        setVoiceOpen(false);
                        setUploadOpen(true);
                      }}
                      testId="edit-note-upload-audio"
                    />
                  </div>
                )}
              </div>
            )}
            {pauseEditorForVoice ? (
              <NoteEditorPausedForVoice testId="edit-note-editor-paused" />
            ) : (
              <MarkdownEditor
                value={body}
                onChange={setBody}
                id="edit-note-markdown"
                onSave={() => void handleSave()}
                checklistsDisabled={busy}
                status={editorStatus}
              />
            )}
          </FormField>

          <div className={cn(focusMode && "note-focus-hide")} data-testid="edit-note-attachments-field">
            <NoteAttachmentsField
              noteId={id}
              userId={vaultUserId}
              wrappedKey={wrappedKey}
              enabled={canRead}
              onAttachmentsChange={() => touchVaultActivity()}
            />
          </div>

          <div data-testid="edit-note-tags-field">
            <FormField id="edit-tags" label="Tags">
              <TagChipInput
                tags={tags}
                tagIds={metadata.tagIds}
                onTagIdsChange={(tagIds) => {
                  touchVaultActivity();
                  setMetadata({ ...metadata, tagIds });
                }}
                onCreateTag={createTag}
              />
            </FormField>
          </div>
        </Card>
        </>
      ) : (
        <>
          <div
            className="note-detail-topbar mb-6 flex flex-wrap items-center justify-between gap-3"
            data-testid="note-detail-topbar"
          >
            {backLink}
            <NoteDetailActionBar
              metadata={metadata}
              busy={busy}
              resolving={resolving}
              onEdit={startEditing}
              onMarkResolved={() => void handleMarkResolved()}
              onReopen={() => void handleReopen()}
              onEnterZen={() => setZenMode(true)}
              kanbanHref={kanbanBoard ? `/kanban/${kanbanBoard.boardId}` : null}
              kanbanProgressLabel={
                kanbanProgress ? `${kanbanProgress.done}/${kanbanProgress.total}` : null
              }
              onGenerateKanban={
                !kanbanBoard && recognizedKanbanActivities.length > 0
                  ? () => void handleCreateKanbanBoard()
                  : undefined
              }
              onTogglePinned={() => void toggleNotePinned(id, !metadata.pinned).then(setMetadata)}
              onToggleFavorite={() => void toggleNoteFavorite(id, !metadata.favorite).then(setMetadata)}
              onToggleArchived={() => void toggleNoteArchived(id, !metadata.archived).then(setMetadata)}
              onDuplicate={() => void handleDuplicate()}
              onMoveToTrash={() => setDeleteOpen(true)}
            />
          </div>
        <div className="lg:flex lg:items-start lg:gap-10">
          <div className="min-w-0 lg:flex-1">
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
              compareSlot={
                versionCompareOpen ? (
                  <div className="mt-6" data-testid="note-version-compare-panel">
                    <NoteVersionHistory
                      noteId={id}
                      enabled={canRead}
                      currentTitle={metadata.title}
                      currentBody={body}
                      onRestore={handleRestoreVersion}
                      restoring={restoringVersion || busy}
                      refreshKey={versionRefreshKey}
                      initialExpanded
                      onCollapse={() => setVersionCompareOpen(false)}
                    />
                  </div>
                ) : null
              }
            />
            {!metadata.trashed && (
              <div className="mt-6">
                {(kanbanError || notesError) && (
                  <Alert variant="danger" className="mb-3">
                    {kanbanError ?? notesError}
                  </Alert>
                )}
                <GenerateFromNotePanel
                  noteId={id}
                  noteTitle={metadata.title}
                  body={body}
                  existingBoard={kanbanBoard}
                  loading={kanbanLoading || kanbanSaving}
                  onCreate={handleCreateKanbanBoard}
                  onResync={handleResyncKanbanBoard}
                />
              </div>
            )}
          </div>

          <aside className="mt-6 space-y-4 lg:mt-0 lg:w-[300px] lg:flex-none" data-testid="note-detail-rail">
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-2)] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Details
              </p>
              <dl className="space-y-1.5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--muted)]">Created</dt>
                  <dd className="font-medium text-[var(--foreground)]">
                    {formatNoteDate(metadata.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--muted)]">Updated</dt>
                  <dd className="font-medium text-[var(--foreground)]">
                    {formatNoteDate(metadata.updatedAt)}
                  </dd>
                </div>
                {versionCount !== null && (
                  <div className="flex justify-between gap-2" data-testid="note-detail-version-count">
                    <dt className="text-[var(--muted)]">Versions</dt>
                    <dd className="font-medium text-[var(--foreground)]">{versionCount}</dd>
                  </div>
                )}
              </dl>
            </div>
            {vaultUserId && wrappedKey && (
              <NoteAttachmentsRail
                noteId={id}
                userId={vaultUserId}
                wrappedKey={wrappedKey}
                enabled={canRead}
              />
            )}
            <NoteVersionHistoryRail
              noteId={id}
              enabled={canRead}
              onRestore={handleRestoreVersion}
              onCompare={() => setVersionCompareOpen(true)}
              restoring={restoringVersion || busy}
              refreshKey={versionRefreshKey}
              onVersionCount={setVersionCount}
            />

            {!metadata.trashed && (
              <div className="flex gap-2" data-testid="note-detail-rail-actions">
                <button
                  type="button"
                  onClick={() => void handleDuplicate()}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-[var(--border)] bg-[var(--card)] py-2.5 text-[12.5px] font-semibold text-[var(--fg-2)] transition-colors hover:bg-[var(--card-2)] disabled:opacity-60"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                  </svg>
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => void toggleNoteArchived(id, !metadata.archived).then(setMetadata)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-[var(--border)] bg-[var(--card)] py-2.5 text-[12.5px] font-semibold text-[var(--fg-2)] transition-colors hover:bg-[var(--card-2)] disabled:opacity-60"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                  </svg>
                  {metadata.archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  disabled={busy}
                  aria-label="Move to trash"
                  className="flex flex-none items-center justify-center rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[var(--danger)] transition-colors hover:bg-[var(--card-2)] disabled:opacity-60"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                  </svg>
                </button>
              </div>
            )}
          </aside>
        </div>
        </>
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
