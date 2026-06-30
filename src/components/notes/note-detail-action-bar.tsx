"use client";

import Link from "next/link";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import {
  IconCheck,
  IconMoreVertical,
  IconPencil,
  IconZen,
} from "@/components/ui/toolbar-icons";
import { NoteMoreActionsMenu } from "@/components/notes/note-more-actions-menu";
import type { NoteMetadataPlaintext } from "@/lib/crypto-client/notes";

interface NoteDetailActionBarProps {
  metadata: NoteMetadataPlaintext;
  busy?: boolean;
  resolving?: boolean;
  onEdit: () => void;
  onMarkResolved?: () => void;
  onReopen?: () => void;
  onEnterZen?: () => void;
  kanbanHref?: string | null;
  kanbanProgressLabel?: string | null;
  onGenerateKanban?: () => void;
  onTogglePinned: () => void;
  onToggleFavorite: () => void;
  onToggleArchived: () => void;
  onDuplicate: () => void;
  onMoveToTrash: () => void;
  /** When true, duplicate/archive/trash live in the right rail (mockup). */
  railLifecycleActions?: boolean;
}

/** Top-right toolbar on note detail — uniform controls with icons (Stillness mockup). */
export function NoteDetailActionBar({
  metadata,
  busy = false,
  resolving = false,
  onEdit,
  onMarkResolved,
  onReopen,
  onEnterZen,
  kanbanHref,
  kanbanProgressLabel,
  onGenerateKanban,
  onTogglePinned,
  onToggleFavorite,
  onToggleArchived,
  onDuplicate,
  onMoveToTrash,
  railLifecycleActions = true,
}: NoteDetailActionBarProps) {
  if (metadata.trashed) return null;

  const resolveBusy = busy || resolving;

  return (
    <div className="note-detail-action-bar" data-testid="note-detail-action-bar">
      {!metadata.answered && onMarkResolved && (
        <ToolbarButton
          label="Mark resolved"
          testId="note-mark-resolved-button"
          primary
          icon={<IconCheck />}
          disabled={resolveBusy}
          onClick={onMarkResolved}
        />
      )}
      {metadata.answered && onReopen && (
        <ToolbarButton
          label="Reopen"
          testId="note-reopen-button"
          icon={<IconCheck />}
          disabled={resolveBusy}
          onClick={onReopen}
        />
      )}
      <ToolbarButton
        label="Edit"
        testId="note-edit-button"
        icon={<IconPencil />}
        disabled={busy}
        onClick={onEdit}
      />
      {kanbanHref ? (
        <Link
          href={kanbanHref}
          className="inline-flex min-h-[var(--toolbar-control-height)] items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--fg-2)] transition-colors hover:bg-[var(--card-muted)]"
          data-testid="note-kanban-link"
        >
          Kanban{kanbanProgressLabel ? ` ${kanbanProgressLabel}` : ""}
        </Link>
      ) : onGenerateKanban ? (
        <ToolbarButton
          label="Generate kanban"
          testId="note-generate-kanban-button"
          icon={<IconMoreVertical />}
          disabled={busy}
          onClick={onGenerateKanban}
        />
      ) : null}
      {onEnterZen && (
        <ToolbarButton
          label="Zen"
          testId="note-zen-button"
          icon={<IconZen />}
          onClick={onEnterZen}
        />
      )}
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
        hideLifecycleActions={railLifecycleActions}
      />
    </div>
  );
}
