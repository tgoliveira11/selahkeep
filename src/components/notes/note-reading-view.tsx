"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { NoteMoreActionsMenu } from "@/components/notes/note-more-actions-menu";
import { NoteStateIndicators } from "@/components/notes/note-state-indicators";
import { formatNoteListDates } from "@/lib/notes/note-dates";
import type { VaultCategory, VaultTag } from "@/lib/crypto-client/vault-index-types";
import type { NoteMetadataPlaintext } from "@/lib/crypto-client/notes";

interface NoteReadingViewProps {
  metadata: NoteMetadataPlaintext;
  body: string;
  categories: VaultCategory[];
  tags: VaultTag[];
  busy?: boolean;
  resolving?: boolean;
  checklistSaveState: "idle" | "saving" | "saved" | "error";
  onEdit: () => void;
  onToggleResolved: () => void;
  onTogglePinned: () => void;
  onToggleFavorite: () => void;
  onToggleArchived: () => void;
  onDuplicate: () => void;
  onMoveToTrash: () => void;
  onRestoreFromTrash: () => void;
  onPermanentDelete: () => void;
  onChecklistChange: (markdown: string) => void;
}

export function NoteReadingView({
  metadata,
  body,
  categories,
  tags,
  busy = false,
  resolving = false,
  checklistSaveState,
  onEdit,
  onToggleResolved,
  onTogglePinned,
  onToggleFavorite,
  onToggleArchived,
  onDuplicate,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onChecklistChange,
}: NoteReadingViewProps) {
  const categoryName = metadata.categoryId
    ? categories.find((category) => category.id === metadata.categoryId)?.name ?? null
    : null;

  return (
    <article className="note-reading-view" data-testid="note-reading-view">
      {metadata.archived && !metadata.trashed && (
        <Alert variant="info" className="mb-4" data-testid="note-archived-banner">
          <p className="font-medium">Archived note</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            This note is hidden from your active notes.
          </p>
        </Alert>
      )}

      {metadata.trashed && (
        <Alert variant="info" className="mb-4" data-testid="note-trashed-banner">
          <p className="font-medium">Note in trash</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Restore it or delete it permanently.
          </p>
        </Alert>
      )}

      <header className="note-reading-view__header space-y-3">
        <div className="note-reading-view__title-row flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-balance">
            {metadata.title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {!metadata.trashed && (
              <>
                <Button onClick={onEdit} data-testid="note-edit-button">
                  Edit
                </Button>
                <NoteMoreActionsMenu
                  pinned={metadata.pinned}
                  favorite={metadata.favorite}
                  archived={metadata.archived}
                  busy={busy}
                  onTogglePinned={onTogglePinned}
                  onToggleFavorite={onToggleFavorite}
                  onToggleArchived={onToggleArchived}
                  onDuplicate={onDuplicate}
                  onMoveToTrash={onMoveToTrash}
                />
              </>
            )}
            {metadata.trashed && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={busy} onClick={onRestoreFromTrash} data-testid="restore-note">
                  Restore note
                </Button>
                <Button variant="danger" disabled={busy} onClick={onPermanentDelete} data-testid="permanent-delete">
                  Delete permanently
                </Button>
              </div>
            )}
          </div>
        </div>

        <NoteStateIndicators
          answered={metadata.answered}
          pinned={metadata.pinned}
          favorite={metadata.favorite}
          archived={metadata.archived}
          trashed={metadata.trashed}
          interactive
          resolving={resolving}
          onTogglePinned={metadata.trashed || metadata.archived ? undefined : onTogglePinned}
          onToggleFavorite={metadata.trashed || metadata.archived ? undefined : onToggleFavorite}
          onToggleResolved={metadata.trashed ? undefined : onToggleResolved}
          className="note-reading-view__states"
        />

        <div className="note-reading-view__metadata flex flex-wrap items-center gap-2" data-testid="note-detail-metadata">
          {categoryName && <NoteCategoryLabel name={categoryName} />}
          {metadata.tagIds.map((tagId) => {
            const tag = tags.find((item) => item.id === tagId);
            return tag ? <NoteTagChip key={tagId} name={tag.name} /> : null;
          })}
        </div>

        <p className="text-xs text-[var(--muted)]" data-testid="note-detail-dates">
          {formatNoteListDates(metadata.createdAt, metadata.updatedAt)}
        </p>
      </header>

      <div className="note-reading-surface" data-testid="note-reading-surface">
        {checklistSaveState !== "idle" && (
          <p className="mb-3 text-sm text-[var(--muted)]" role="status" data-testid="checklist-save-state">
            {checklistSaveState === "saving" && "Saving…"}
            {checklistSaveState === "saved" && "Saved"}
            {checklistSaveState === "error" && "Could not save checklist changes"}
          </p>
        )}
        <MarkdownPreview
          markdown={body}
          onMarkdownChange={onChecklistChange}
          checklistsDisabled={checklistSaveState === "saving" || busy}
          className="note-reading-surface__content text-base leading-relaxed text-[var(--foreground)]"
        />
      </div>
    </article>
  );
}
