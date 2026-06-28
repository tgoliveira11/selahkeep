"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import type { EditorStatus } from "@/components/notes/editor-status-bar";
import { NoteCategoryField } from "@/features/notes/category-tag-fields";
import { TagChipInput } from "@/features/notes/tag-chip-input";
import { useCategoriesTags } from "@/features/notes/use-categories-tags";
import { useNotes } from "@/features/notes/use-notes";
import {
  useAutosaveTimer,
  useConfirmLeave,
  useUnsavedChangesWarning,
} from "@/features/notes/use-unsaved-changes";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import {
  deleteEncryptedNoteDraft,
  loadEncryptedNoteDraft,
  NEW_NOTE_DRAFT_KEY,
  saveEncryptedNoteDraft,
  type NoteDraftPlaintext,
} from "@/lib/crypto-client/note-drafts";
import {
  DAILY_NOTE_TEMPLATE_ID,
  getNoteTemplate,
  parseNoteTemplateId,
  type NoteTemplateId,
} from "@/lib/notes/note-templates";
import { formatDailyNoteTitle } from "@/lib/notes/daily-note";
import {
  activateDraftField,
  EMPTY_DRAFT_USER_ACTIVATION,
  isDraftActivatedByUser,
  type DraftUserActivation,
} from "@/lib/notes/draft-user-activation";
import {
  filterUserCreatedCategories,
  getTemplateCategoryName,
  isTemplateWithLockedCategory,
  resolveTemplateCategoryId,
} from "@/lib/notes/template-category";
import { cn } from "@/lib/ui/cn";
import { NoteDetailRailCard } from "@/components/notes/note-detail-rail";
import { NoteEditorDictateRail } from "@/components/notes/note-editor-dictate-rail";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultLockedState } from "@/features/vault/vault-locked-state";
import { useNoteVaultBeforeAutoLock } from "@/features/notes/use-note-vault-before-auto-lock";
import { useVaultAutoLockedCopy } from "@/features/vault/use-vault-auto-locked-copy";
import { touchVaultActivity } from "@/features/vault/use-vault-activity";
import { appendTranscript } from "@/lib/voice/transcript-format";
import { isVoiceNotesEnabled } from "@/lib/voice/voice-config";
import { AudioUploadButton } from "@/features/voice/audio-upload-button";
import { useOnlineStatus } from "@/features/notes/use-online-status";
import { encryptAttachment } from "@/lib/crypto-client/note-attachments";
import { noteAttachmentsApi } from "@/lib/api-client/note-attachments";
import { attachmentRejectionReason } from "@/lib/notes/attachment-file-types";
import { getMaxAttachmentSizeBytes } from "@/lib/config/attachment-policy";

const VoiceCapturePanel = dynamic(
  () => import("@/features/voice/voice-capture-panel").then((m) => m.VoiceCapturePanel),
  { ssr: false }
);

const AudioUploadPanel = dynamic(
  () => import("@/features/voice/audio-upload-panel").then((m) => m.AudioUploadPanel),
  { ssr: false }
);

const TITLE_REQUIRED_MESSAGE = "Add a title before saving your note.";

export default function NewNotePage() {
  const vault = useRequireVault();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDailyNote = searchParams.get("daily") === "1";
  const templateFromQuery = parseNoteTemplateId(searchParams.get("template"));
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const voiceEnabled = isVoiceNotesEnabled();
  const [title, setTitle] = useState(() => {
    if (isDailyNote) return formatDailyNoteTitle();
    if (templateFromQuery && templateFromQuery !== "blank") {
      return getNoteTemplate(templateFromQuery).label;
    }
    return "";
  });
  const [body, setBody] = useState(() => {
    if (isDailyNote) return getNoteTemplate(DAILY_NOTE_TEMPLATE_ID).body;
    if (templateFromQuery) return getNoteTemplate(templateFromQuery).body;
    return "";
  });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState<NoteTemplateId>(() =>
    isDailyNote ? DAILY_NOTE_TEMPLATE_ID : templateFromQuery ?? "blank"
  );
  const [categoryLocked, setCategoryLocked] = useState(
    () =>
      isDailyNote ||
      (templateFromQuery ? isTemplateWithLockedCategory(templateFromQuery) : false)
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<NoteDraftPlaintext | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftActivation, setDraftActivation] = useState<DraftUserActivation>(
    EMPTY_DRAFT_USER_ACTIVATION
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const applyingTemplateRef = useRef(
    isDailyNote ||
      (templateFromQuery != null &&
        templateFromQuery !== "blank" &&
        getNoteTemplate(templateFromQuery).body.trim().length > 0)
  );
  const online = useOnlineStatus();

  const userId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { createNote, busy, error: notesError } = useNotes(userId);
  const { categories, tags, createCategory, createTag } = useCategoriesTags(userId, vaultUnlocked);

  const userCategories = useMemo(
    () => filterUserCreatedCategories(categories),
    [categories]
  );

  const autoLocked = useVaultAutoLockedCopy();
  const trimmedTitle = title.trim();
  const canSave = Boolean(trimmedTitle && body.trim());
  const dirty = isDraftActivatedByUser(draftActivation);
  const showManualCategory = templateId === "blank";
  const showTemplateCategory = categoryLocked && isTemplateWithLockedCategory(templateId);

  useUnsavedChangesWarning(dirty);
  const { requestLeave, confirmDialog } = useConfirmLeave(dirty);

  const persistDraft = useCallback(async () => {
    if (!userId || !dirty) return;
    const draft: NoteDraftPlaintext = {
      title,
      body,
      categoryId,
      tagIds,
      answered: false,
      updatedAt: new Date().toISOString(),
    };
    await saveEncryptedNoteDraft(userId, NEW_NOTE_DRAFT_KEY, draft);
    setDraftSaved(true);
  }, [body, categoryId, dirty, tagIds, title, userId]);

  const canWrite = vault.status === "ready" && vault.vaultUnlocked;

  useNoteVaultBeforeAutoLock(dirty, persistDraft);
  useAutosaveTimer(Boolean(userId && dirty), persistDraft);

  const activateDraft = useCallback((field: keyof DraftUserActivation) => {
    setDraftActivation((current) => activateDraftField(current, field));
  }, []);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setTitle("");
      setBody("");
      setCategoryId(null);
      setTagIds([]);
      setTemplateId("blank");
      setCategoryLocked(false);
      setTitleError(null);
      setError(null);
      setDraftPrompt(null);
      setDraftSaved(false);
      setDraftActivation(EMPTY_DRAFT_USER_ACTIVATION);
      setPendingFiles([]);
    });
  }, []);

  useEffect(() => {
    if (!userId || !canWrite) return;
    let cancelled = false;

    void (async () => {
      const draft = await loadEncryptedNoteDraft(userId, NEW_NOTE_DRAFT_KEY);
      if (cancelled) return;
      if (draft && (draft.title.trim() || draft.body.trim())) {
        setDraftPrompt(draft);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, canWrite]);

  function restoreDraft() {
    if (!draftPrompt) return;
    setTitle(draftPrompt.title);
    setBody(draftPrompt.body);
    setCategoryId(draftPrompt.categoryId);
    setTagIds(draftPrompt.tagIds);
    setDraftPrompt(null);
    setDraftActivation(activateDraftField(EMPTY_DRAFT_USER_ACTIVATION, "content"));
    setCategoryLocked(false);
    setTemplateId("blank");
  }

  async function discardDraft() {
    if (userId) {
      await deleteEncryptedNoteDraft(userId, NEW_NOTE_DRAFT_KEY);
    }
    setDraftPrompt(null);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!trimmedTitle) {
      setTitleError(TITLE_REQUIRED_MESSAGE);
      return;
    }

    try {
      let resolvedCategoryId = categoryId;
      if (categoryLocked && isTemplateWithLockedCategory(templateId)) {
        resolvedCategoryId = await resolveTemplateCategoryId(
          templateId,
          categories,
          createCategory
        );
      }

      const note = await createNote({
        title: trimmedTitle,
        body,
        categoryId: resolvedCategoryId,
        tagIds,
        answered: false,
      });

      if (pendingFiles.length > 0 && userId) {
        const noteRecord = await import("@/lib/api-client/notes").then((m) => m.notesApi.get(note.id));
        for (const file of pendingFiles) {
          const attachmentId = crypto.randomUUID();
          const encrypted = await encryptAttachment(
            userId,
            note.id,
            attachmentId,
            file,
            noteRecord.encryptedWrappedNoteKey
          );
          await noteAttachmentsApi.create(note.id, encrypted);
        }
      }

      if (userId) {
        await deleteEncryptedNoteDraft(userId, NEW_NOTE_DRAFT_KEY);
      }
      setDraftActivation(EMPTY_DRAFT_USER_ACTIVATION);
      router.push(`/notes/${note.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save note");
    }
  }

  const lockedCategoryName = useMemo(
    () => getTemplateCategoryName(templateId),
    [templateId]
  );

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
      <AuthenticatedPage width="notes">
        <PageHeader title="New note" description="Unlock your vault to begin writing." />
        <VaultLockedState
          variant="write"
          autoLocked={autoLocked}
          returnTo="/notes/new"
        />
      </AuthenticatedPage>
    );
  }

  const displayError = error ?? notesError;

  const editorStatus: EditorStatus = busy
    ? "saving"
    : !online && dirty
      ? "offline"
      : displayError && dirty
        ? "save-failed"
        : dirty
          ? "unsaved"
          : draftSaved
            ? "draft-saved"
            : "idle";

  const statusLabel =
    editorStatus === "saving"
      ? "Saving…"
      : editorStatus === "offline"
        ? "Offline — saved on device"
        : editorStatus === "save-failed"
          ? "Autosave failed"
          : editorStatus === "unsaved"
            ? "Unsaved changes"
            : editorStatus === "draft-saved"
              ? "Draft saved"
              : null;

  return (
    <AuthenticatedPage width="notes">
      <div
        className="mb-6 flex items-center justify-between gap-3"
        data-testid="note-editor-topbar"
      >
        <button
          type="button"
          onClick={() => requestLeave(() => router.back())}
          className="-ml-1 flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-1.5 text-sm font-semibold text-[var(--fg-2)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Notes
        </button>
        <div className="flex items-center gap-3">
          {statusLabel && (
            <span
              className={cn(
                "flex items-center gap-1.5 text-[13px] font-medium tabular-nums",
                editorStatus === "save-failed"
                  ? "text-[var(--danger)]"
                  : editorStatus === "draft-saved"
                    ? "text-[var(--success)]"
                    : "text-[var(--muted)]"
              )}
              role="status"
              data-testid="note-editor-topbar-status"
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  editorStatus === "save-failed"
                    ? "bg-[var(--danger)]"
                    : editorStatus === "draft-saved"
                      ? "bg-[var(--success)]"
                      : "bg-[var(--muted)]"
                )}
              />
              {statusLabel}
            </span>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => requestLeave(() => router.back())}
            data-testid="note-editor-discard"
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || !canSave}
            title={!trimmedTitle ? TITLE_REQUIRED_MESSAGE : undefined}
          >
            {busy ? "Saving securely…" : "Save note"}
          </Button>
        </div>
      </div>

      <div className="note-editor-surface space-y-6" data-testid="note-editor-surface">
        {draftPrompt && (
          <Alert variant="info" role="status">
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

        {dirty && (
          <p className="text-sm text-[var(--muted)] sr-only" role="status">
            You have unsaved changes.
          </p>
        )}

        <form onSubmit={handleSubmit} className="note-editor-grid space-y-5 lg:space-y-0">
          <div data-area="title" data-testid="new-note-title-field">
            <input
              id="note-title"
              aria-label="Title"
              value={title}
              onChange={(e) => {
                touchVaultActivity();
                activateDraft("title");
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              onPaste={() => activateDraft("title")}
              placeholder={getNoteTemplate(templateId).titlePlaceholder}
              maxLength={200}
              required
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "note-title-error" : undefined}
              className="w-full border-0 bg-transparent px-0 py-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
            />
            {titleError && (
              <p id="note-title-error" className="mt-1 text-sm text-[var(--danger)]" role="alert">
                {titleError}
              </p>
            )}
          </div>

          <div data-area="tags" data-testid="new-note-tags-field">
            <TagChipInput
              tags={tags}
              tagIds={tagIds}
              onTagIdsChange={(value) => {
                touchVaultActivity();
                activateDraft("tags");
                setTagIds(value);
              }}
              onCreateTag={createTag}
            />
          </div>

          {/* Desktop right rail: dictate + encryption notice. */}
          <aside data-area="rail" className="space-y-4" data-testid="new-note-rail">
            {voiceEnabled &&
              (voiceOpen ? (
                <VoiceCapturePanel
                  onClose={() => setVoiceOpen(false)}
                  onInsert={(text) => {
                    touchVaultActivity();
                    activateDraft("content");
                    setBody((current) => appendTranscript(current, text));
                  }}
                />
              ) : uploadOpen ? (
                <AudioUploadPanel
                  onClose={() => setUploadOpen(false)}
                  onInsert={(text) => {
                    touchVaultActivity();
                    activateDraft("content");
                    setBody((current) => appendTranscript(current, text));
                  }}
                />
              ) : (
                <div className="space-y-3">
                  <NoteEditorDictateRail
                    onOpen={() => {
                      touchVaultActivity();
                      setUploadOpen(false);
                      setVoiceOpen(true);
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <AudioUploadButton
                      onClick={() => {
                        touchVaultActivity();
                        setVoiceOpen(false);
                        setUploadOpen(true);
                      }}
                      testId="new-note-upload-audio"
                    />
                  </div>
                </div>
              ))}

            <NoteDetailRailCard
              title="Encrypted on this device"
              testId="new-note-encryption-notice"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2.2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              }
            >
              <p className="text-[12.5px] leading-relaxed text-[var(--fg-2)]">
                Encrypted on this device before it&apos;s saved. Only you can read it.
              </p>
            </NoteDetailRailCard>
          </aside>

          <div data-area="editor" data-testid="new-note-editor-field">
            <MarkdownEditor
              value={body}
              onChange={(value) => {
                setBody(value);
                if (applyingTemplateRef.current) {
                  applyingTemplateRef.current = false;
                  return;
                }
                activateDraft("content");
              }}
              onSave={() => void handleSubmit()}
              status={editorStatus}
            />
          </div>

          {(showManualCategory || showTemplateCategory) && (
            <div
              data-area="category"
              className="note-editor-category-secondary"
              data-testid="new-note-category-section"
            >
              {showTemplateCategory ? (
                <NoteCategoryField
                  categories={[]}
                  categoryId={null}
                  categoryLocked
                  lockedCategoryName={lockedCategoryName}
                  onCategoryChange={() => {}}
                />
              ) : (
                <NoteCategoryField
                  categories={userCategories}
                  categoryId={categoryId}
                  onCategoryChange={(value) => {
                    touchVaultActivity();
                    activateDraft("manualCategory");
                    setCategoryId(value);
                  }}
                  onCreateCategory={createCategory}
                />
              )}
            </div>
          )}

          <div data-area="attachments" data-testid="new-note-attachments-field">
            <FormField
              id="new-note-pending-attachments"
              label="Attachments"
              hint="Files are encrypted when you save the note."
            >
              <input
                id="new-note-pending-attachments"
                type="file"
                multiple
                className="sr-only"
                data-testid="new-note-pending-attachments-input"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const maxBytes = getMaxAttachmentSizeBytes();
                  const accepted: File[] = [];
                  for (const file of Array.from(files)) {
                    const rejection = attachmentRejectionReason(file);
                    if (rejection) {
                      setError(rejection);
                      continue;
                    }
                    if (file.size > maxBytes) {
                      setError(`"${file.name}" exceeds the size limit.`);
                      continue;
                    }
                    accepted.push(file);
                  }
                  if (accepted.length) {
                    touchVaultActivity();
                    activateDraft("attachments");
                    setPendingFiles((current) => [...current, ...accepted]);
                  }
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  document.getElementById("new-note-pending-attachments")?.click()
                }
                data-testid="new-note-pending-attachments-upload"
              >
                Choose files
              </Button>
              {pendingFiles.length > 0 && (
                <ul className="mt-3 space-y-2" data-testid="new-note-pending-attachments-list">
                  {pendingFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          activateDraft("attachments");
                          setPendingFiles((current) => current.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </FormField>
          </div>

          {displayError && (
            <p data-area="error" className="text-sm text-[var(--danger)]" role="alert">
              {displayError}
            </p>
          )}
          {/* Submit is driven by the top-bar Save button and ⌘/Ctrl+Enter in the editor. */}
        </form>
      </div>
      {confirmDialog}
    </AuthenticatedPage>
  );
}
