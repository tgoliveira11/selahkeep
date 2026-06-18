"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  type NoteTemplateId,
} from "@/lib/notes/note-templates";
import { formatDailyNoteTitle } from "@/lib/notes/daily-note";
import { cn } from "@/lib/ui/cn";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";

const TITLE_REQUIRED_MESSAGE = "Add a title before saving your note.";

const EMPTY_FORM = {
  title: "",
  body: "",
  categoryId: null as string | null,
  tagIds: [] as string[],
};

export default function NewNotePage() {
  const vault = useRequireVault();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDailyNote = searchParams.get("daily") === "1";
  const [focusMode, setFocusMode] = useState(false);
  const [title, setTitle] = useState(() => (isDailyNote ? formatDailyNoteTitle() : ""));
  const [body, setBody] = useState(() =>
    isDailyNote ? getNoteTemplate(DAILY_NOTE_TEMPLATE_ID).body : ""
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState<NoteTemplateId>(() =>
    isDailyNote ? DAILY_NOTE_TEMPLATE_ID : "blank"
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<NoteDraftPlaintext | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY_FORM));

  const userId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { createNote, busy, error: notesError } = useNotes(userId);
  const { categories, tags, createCategory, createTag } = useCategoriesTags(userId, vaultUnlocked);

  const canWrite = vault.status === "ready" && vault.vaultUnlocked;
  const trimmedTitle = title.trim();
  const canSave = Boolean(trimmedTitle && body.trim());

  const formSnapshot = useMemo(
    () => JSON.stringify({ title, body, categoryId, tagIds }),
    [title, body, categoryId, tagIds]
  );
  const dirty = hydrated && formSnapshot !== baseline;
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

  useAutosaveTimer(Boolean(userId && dirty), persistDraft);

  useEffect(() => {
    return subscribeVaultSession(() => {
      setTitle("");
      setBody("");
      setCategoryId(null);
      setTagIds([]);
      setTitleError(null);
      setError(null);
      setDraftPrompt(null);
      setDraftSaved(false);
      setHydrated(false);
      setBaseline(JSON.stringify(EMPTY_FORM));
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
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, canWrite]);

  function applyTemplate(id: NoteTemplateId) {
    if (id === templateId) return;
    if (body.trim() && typeof window !== "undefined") {
      const confirmed = window.confirm("Replace current note content with this template?");
      if (!confirmed) return;
    }
    setTemplateId(id);
    const template = getNoteTemplate(id);
    setBody(template.body);
  }

  function restoreDraft() {
    if (!draftPrompt) return;
    setTitle(draftPrompt.title);
    setBody(draftPrompt.body);
    setCategoryId(draftPrompt.categoryId);
    setTagIds(draftPrompt.tagIds);
    setDraftPrompt(null);
    setBaseline(
      JSON.stringify({
        title: draftPrompt.title,
        body: draftPrompt.body,
        categoryId: draftPrompt.categoryId,
        tagIds: draftPrompt.tagIds,
      })
    );
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
      setBaseline(formSnapshot);
      router.push(`/notes/${note.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save note");
    }
  }

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
    <PageLayout className={cn(focusMode && "note-page--focus")}>
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

      <Card className="space-y-6">
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
            <NoteTemplatePicker value={templateId} onChange={applyTemplate} disabled={busy} />
          </div>
          <div className={cn(focusMode && "note-focus-hide")}>
            <CategoryTagFields
            mode="create"
            categories={categories}
            tags={tags}
            categoryId={categoryId}
            tagIds={tagIds}
            onCategoryChange={setCategoryId}
            onTagIdsChange={setTagIds}
            onCreateCategory={createCategory}
            onCreateTag={createTag}
            />
          </div>
          <FormField id="note-body" label="Your note">
            <MarkdownEditor
              value={body}
              onChange={setBody}
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
      </Card>
      {confirmDialog}
    </PageLayout>
  );
}
