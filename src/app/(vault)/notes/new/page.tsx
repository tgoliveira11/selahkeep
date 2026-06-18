"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { PrivacyNotice } from "@/components/ui/privacy-notice";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import type { EditorStatus } from "@/components/notes/editor-status-bar";
import { NoteFocusModeToggle } from "@/features/notes/note-focus-mode-toggle";
import { CategoryTagFields } from "@/features/notes/category-tag-fields";
import { NoteTemplatePicker } from "@/features/notes/note-template-picker";
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
import { isDraftActivatedByUser } from "@/lib/notes/draft-user-activation";
import {
  getTemplateCategoryName,
  isTemplateWithLockedCategory,
  resolveTemplateCategoryId,
} from "@/lib/notes/template-category";
import { cn } from "@/lib/ui/cn";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultLockedState } from "@/features/vault/vault-locked-state";
import { useNoteVaultBeforeAutoLock } from "@/features/notes/use-note-vault-before-auto-lock";
import { useVaultAutoLockedCopy } from "@/features/vault/use-vault-auto-locked-copy";
import { touchVaultActivity } from "@/features/vault/use-vault-activity";
import type { VaultCategory } from "@/lib/crypto-client/vault-index-types";

const TITLE_REQUIRED_MESSAGE = "Add a title before saving your note.";

export default function NewNotePage() {
  const vault = useRequireVault();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDailyNote = searchParams.get("daily") === "1";
  const templateFromQuery = parseNoteTemplateId(searchParams.get("template"));
  const [focusMode, setFocusMode] = useState(false);
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
  const [userStartedDraft, setUserStartedDraft] = useState(false);
  const templateCategoryApplied = useRef(false);

  const userId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { createNote, busy, error: notesError } = useNotes(userId);
  const { categories, tags, createCategory, createTag } = useCategoriesTags(userId, vaultUnlocked);

  const autoLocked = useVaultAutoLockedCopy();
  const trimmedTitle = title.trim();
  const canSave = Boolean(trimmedTitle && body.trim());
  const dirty = isDraftActivatedByUser(userStartedDraft);

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

  const markUserEdit = useCallback(() => {
    setUserStartedDraft(true);
  }, []);

  const assignTemplateCategory = useCallback(
    async (
      id: NoteTemplateId,
      currentCategories: VaultCategory[],
      currentTitle: string,
      _currentBody: string,
      _currentTagIds: string[]
    ) => {
      if (!isTemplateWithLockedCategory(id)) {
        setCategoryLocked(false);
        setCategoryId(null);
        return;
      }

      const nextCategoryId = await resolveTemplateCategoryId(
        id,
        currentCategories,
        createCategory
      );
      const template = getNoteTemplate(id);
      if (!currentTitle.trim()) {
        setTitle(template.label);
      }
      setCategoryId(nextCategoryId);
      setCategoryLocked(true);
    },
    [createCategory]
  );

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
      setUserStartedDraft(false);
      templateCategoryApplied.current = false;
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

  useEffect(() => {
    if (!canWrite || !isDailyNote || templateCategoryApplied.current) return;
    templateCategoryApplied.current = true;
    void assignTemplateCategory(
      DAILY_NOTE_TEMPLATE_ID,
      categories,
      title,
      body,
      tagIds
    );
  }, [assignTemplateCategory, body, canWrite, categories, isDailyNote, tagIds, title]);

  useEffect(() => {
    if (!canWrite || isDailyNote || !templateFromQuery || templateCategoryApplied.current) return;
    if (!isTemplateWithLockedCategory(templateFromQuery)) return;
    templateCategoryApplied.current = true;
    void assignTemplateCategory(templateFromQuery, categories, title, body, tagIds);
  }, [
    assignTemplateCategory,
    body,
    canWrite,
    categories,
    isDailyNote,
    tagIds,
    templateFromQuery,
    title,
  ]);

  async function applyTemplate(id: NoteTemplateId) {
    touchVaultActivity();
    if (id === templateId) return;
    if (body.trim() && typeof window !== "undefined") {
      const confirmed = window.confirm("Replace current note content with this template?");
      if (!confirmed) return;
    }

    const template = getNoteTemplate(id);
    setTemplateId(id);
    setBody(template.body);

    if (id === "blank") {
      setCategoryLocked(false);
      setCategoryId(null);
      return;
    }

    const nextCategoryId = await resolveTemplateCategoryId(id, categories, createCategory);
    if (!title.trim()) {
      setTitle(template.label);
    }

    setCategoryId(nextCategoryId);
    setCategoryLocked(true);
  }

  function restoreDraft() {
    if (!draftPrompt) return;
    setTitle(draftPrompt.title);
    setBody(draftPrompt.body);
    setCategoryId(draftPrompt.categoryId);
    setTagIds(draftPrompt.tagIds);
    setDraftPrompt(null);
    setUserStartedDraft(true);
    setCategoryLocked(false);
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
      const note = await createNote({
        title: trimmedTitle,
        body,
        categoryId,
        tagIds,
        answered: false,
      });
      if (userId) {
        await deleteEncryptedNoteDraft(userId, NEW_NOTE_DRAFT_KEY);
      }
      setUserStartedDraft(false);
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
      <AuthenticatedPage width="editor">
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
    : displayError && dirty
      ? "save-failed"
      : dirty
        ? "unsaved"
        : draftSaved
          ? "draft-saved"
          : "idle";

  return (
    <AuthenticatedPage width="editor" className={cn(focusMode && "note-page--focus")}>
      <PageHeader
        title="New note"
        description={
          focusMode
            ? undefined
            : "Write your note. It is encrypted before it leaves this device."
        }
        action={
          <NoteFocusModeToggle active={focusMode} onToggle={() => setFocusMode((v) => !v)} />
        }
      />

      <div className="note-editor-surface space-y-6" data-testid="note-editor-surface">
        <div className={cn(focusMode && "note-focus-hide")}>
          <PrivacyNotice compact />
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField id="note-title" label="Title" hint="Required">
            <Input
              id="note-title"
              value={title}
              onChange={(e) => {
                touchVaultActivity();
                markUserEdit();
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder={getNoteTemplate(templateId).titlePlaceholder}
              maxLength={200}
              required
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "note-title-error" : undefined}
            />
            {titleError && (
              <p id="note-title-error" className="mt-2 text-sm text-[var(--danger)]" role="alert">
                {titleError}
              </p>
            )}
          </FormField>
          <div className={cn(focusMode && "note-focus-hide")}>
            <NoteTemplatePicker
              value={templateId}
              onChange={(id) => void applyTemplate(id)}
              disabled={busy}
            />
          </div>
          <div className={cn(focusMode && "note-focus-hide")}>
            <CategoryTagFields
              mode="create"
              categories={categories}
              tags={tags}
              categoryId={categoryId}
              tagIds={tagIds}
              categoryLocked={categoryLocked}
              lockedCategoryName={lockedCategoryName}
              onCategoryChange={(value) => {
                if (categoryLocked) return;
                touchVaultActivity();
                markUserEdit();
                setCategoryId(value);
              }}
              onTagIdsChange={(value) => {
                touchVaultActivity();
                markUserEdit();
                setTagIds(value);
              }}
              onCreateCategory={createCategory}
              onCreateTag={createTag}
            />
          </div>
          <FormField id="note-body" label="Your note">
            <MarkdownEditor
              value={body}
              onChange={(value) => {
                markUserEdit();
                setBody(value);
              }}
              onSave={() => void handleSubmit()}
              status={editorStatus}
            />
          </FormField>
          {displayError && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {displayError}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={busy || !canSave}
              className="w-full sm:w-auto"
              title={!trimmedTitle ? TITLE_REQUIRED_MESSAGE : undefined}
            >
              {busy ? "Saving securely…" : "Save note"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => requestLeave(() => router.back())}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
      {confirmDialog}
    </AuthenticatedPage>
  );
}
