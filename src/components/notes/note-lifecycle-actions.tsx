"use client";

import { Button } from "@/components/ui/button";

interface NoteLifecycleActionsProps {
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  busy?: boolean;
  onTogglePinned: () => void;
  onToggleFavorite: () => void;
  onToggleArchived: () => void;
  onMoveToTrash: () => void;
  onRestoreFromTrash: () => void;
  onPermanentDelete: () => void;
  onDuplicate: () => void;
}

export function NoteLifecycleActions({
  pinned,
  favorite,
  archived,
  trashed,
  busy = false,
  onTogglePinned,
  onToggleFavorite,
  onToggleArchived,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onDuplicate,
}: NoteLifecycleActionsProps) {
  if (trashed) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button variant="secondary" disabled={busy} onClick={onRestoreFromTrash} data-testid="restore-note">
          Restore from trash
        </Button>
        <Button variant="danger" disabled={busy} onClick={onPermanentDelete} data-testid="permanent-delete">
          Delete permanently
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button
        variant="secondary"
        disabled={busy || archived}
        onClick={onTogglePinned}
        data-testid="toggle-pinned"
      >
        {pinned ? "Unpin" : "Pin"}
      </Button>
      <Button variant="secondary" disabled={busy} onClick={onToggleFavorite} data-testid="toggle-favorite">
        {favorite ? "Remove favorite" : "Favorite"}
      </Button>
      <Button variant="secondary" disabled={busy} onClick={onToggleArchived} data-testid="toggle-archived">
        {archived ? "Unarchive" : "Archive"}
      </Button>
      <Button variant="secondary" disabled={busy} onClick={onDuplicate} data-testid="duplicate-note">
        Duplicate note
      </Button>
      <Button variant="danger" disabled={busy} onClick={onMoveToTrash} data-testid="move-to-trash">
        Move to trash
      </Button>
    </div>
  );
}
