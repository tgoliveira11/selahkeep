"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { NoteMoreActionsMenu } from "@/components/notes/note-more-actions-menu";
import { NoteStateIndicators } from "@/components/notes/note-state-indicators";
import { formatNoteListDates } from "@/lib/notes/note-dates";
import { HighlightedText, SearchMatchBanner } from "@/components/notes/search-highlight";
import { ResolvedReflectionDisplay } from "@/components/notes/resolved-reflection-display";
import { NoteTimeline } from "@/components/notes/note-timeline";
import { NoteAttachmentsReadOnly } from "@/components/notes/note-attachments-readonly";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
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
  onMarkResolved?: () => void;
  onReopen?: () => void;
  onTogglePinned: () => void;
  onToggleFavorite: () => void;
  onToggleArchived: () => void;
  onDuplicate: () => void;
  onMoveToTrash: () => void;
  onRestoreFromTrash: () => void;
  onPermanentDelete: () => void;
  onChecklistChange: (markdown: string) => void;
  searchQuery?: string;
  noteId?: string;
  vaultUserId?: string | null;
  wrappedKey?: EncryptedPayload | null;
  /** Distraction-free reading. When true, only title + body are shown. */
  zen?: boolean;
  onEnterZen?: () => void;
  onExitZen?: () => void;
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
  onMarkResolved,
  onReopen,
  onTogglePinned,
  onToggleFavorite,
  onToggleArchived,
  onDuplicate,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onChecklistChange,
  searchQuery = "",
  noteId,
  vaultUserId,
  wrappedKey,
  zen = false,
  onEnterZen,
  onExitZen,
}: NoteReadingViewProps) {
  const categoryName = metadata.categoryId
    ? categories.find((category) => category.id === metadata.categoryId)?.name ?? null
    : null;

  // Zen mode (mockup): a calm, centered reading surface — title + body only.
  if (zen) {
    return (
      <article className="mx-auto max-w-[640px] px-2 py-2" data-testid="note-reading-zen">
        <button
          type="button"
          onClick={onExitZen}
          data-testid="note-zen-exit"
          className="mb-9 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 9V5a1 1 0 0 0-1-1H4M15 9V5a1 1 0 0 1 1-1h4M9 15v4a1 1 0 0 1-1 1H4M15 15v4a1 1 0 0 0 1 1h4" />
          </svg>
          Exit zen
        </button>
        <h1 className="mb-6 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">
          {metadata.title}
        </h1>
        <MarkdownPreview
          markdown={body}
          onMarkdownChange={onChecklistChange}
          checklistsDisabled={checklistSaveState === "saving" || busy}
          className="text-[1.125rem] leading-[1.85] text-[var(--foreground)]"
        />
      </article>
    );
  }

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
        {searchQuery.trim() && <SearchMatchBanner query={searchQuery} />}

        {/* Metadata header (mockup): category chip + resolved/unresolved status. */}
        <div className="flex flex-wrap items-center gap-2">
          {categoryName && <NoteCategoryLabel name={categoryName} />}
          <span
            data-testid="note-detail-status"
            className={
              metadata.answered
                ? "inline-flex items-center gap-1 rounded-md border border-[var(--success-bd)] bg-[var(--success-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--success)]"
                : "inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)]"
            }
          >
            {metadata.answered ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            )}
            {metadata.answered ? "Resolved" : "Unresolved"}
          </span>
        </div>

        <div className="note-reading-view__title-row flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-balance">
            {searchQuery.trim() ? (
              <HighlightedText text={metadata.title} query={searchQuery} />
            ) : (
              metadata.title
            )}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {!metadata.trashed && (
              <>
                {onEnterZen && (
                  <Button
                    variant="secondary"
                    onClick={onEnterZen}
                    data-testid="note-zen-button"
                    aria-label="Zen reading mode"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 9V5a1 1 0 0 0-1-1H4M15 9V5a1 1 0 0 1 1-1h4M9 15v4a1 1 0 0 1-1 1H4M15 15v4a1 1 0 0 0 1 1h4" />
                    </svg>
                    <span className="ml-1.5 hidden sm:inline">Zen</span>
                  </Button>
                )}
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
          onToggleResolved={metadata.trashed ? undefined : metadata.answered ? onReopen ?? onToggleResolved : onMarkResolved ?? onToggleResolved}
          className="note-reading-view__states"
        />

        <div className="note-reading-view__metadata flex flex-wrap items-center gap-2" data-testid="note-detail-metadata">
          {metadata.tagIds.map((tagId) => {
            const tag = tags.find((item) => item.id === tagId);
            return tag ? <NoteTagChip key={tagId} name={tag.name} /> : null;
          })}
        </div>

        <p className="text-xs text-[var(--muted)]" data-testid="note-detail-dates">
          {formatNoteListDates(metadata.createdAt, metadata.updatedAt)}
        </p>
      </header>

      {metadata.answered && metadata.resolvedReflection && (
        <div className="mt-4">
          <ResolvedReflectionDisplay reflection={metadata.resolvedReflection} />
        </div>
      )}

      <NoteTimeline metadata={metadata} />

      <div className="note-reading-surface mt-6" data-testid="note-reading-surface">
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
          searchQuery={searchQuery}
          className="note-reading-surface__content text-base leading-relaxed text-[var(--foreground)]"
        />
        {noteId && vaultUserId && wrappedKey && (
          <NoteAttachmentsReadOnly
            noteId={noteId}
            userId={vaultUserId}
            wrappedKey={wrappedKey}
          />
        )}
      </div>
    </article>
  );
}
