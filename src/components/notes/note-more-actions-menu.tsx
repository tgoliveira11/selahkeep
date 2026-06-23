"use client";

import { ToolbarMenu } from "@/components/ui/toolbar-menu";
import { IconMoreVertical } from "@/components/ui/toolbar-icons";
import { cn } from "@/lib/ui/cn";

interface NoteMoreActionsMenuProps {
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  busy?: boolean;
  onTogglePinned: () => void;
  onToggleFavorite: () => void;
  onToggleArchived: () => void;
  onDuplicate: () => void;
  onMoveToTrash: () => void;
  /** Hide duplicate, archive, and trash when those actions live in the detail rail. */
  hideLifecycleActions?: boolean;
}

function MenuItem({
  label,
  testId,
  destructive = false,
  disabled = false,
  onClick,
}: {
  label: string;
  testId: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      disabled={disabled}
      className={cn(
        "w-full rounded-[calc(var(--radius)-2px)] px-3 py-2 text-left text-sm transition-colors",
        "hover:bg-[var(--card-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]",
        destructive ? "text-[var(--danger)]" : "text-[var(--foreground)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Progressive-disclosure menu for secondary note lifecycle actions on detail view. */
export function NoteMoreActionsMenu({
  pinned,
  favorite,
  archived,
  busy = false,
  onTogglePinned,
  onToggleFavorite,
  onToggleArchived,
  onDuplicate,
  onMoveToTrash,
  hideLifecycleActions = false,
}: NoteMoreActionsMenuProps) {
  return (
    <ToolbarMenu
      label="More actions"
      testId="note-more-actions-menu"
      align="end"
      icon={<IconMoreVertical />}
      iconOnly
    >
      <div className="flex min-w-[12rem] flex-col gap-0.5">
        <MenuItem
          testId="toggle-pinned"
          label={pinned ? "Unpin note" : "Pin note"}
          disabled={busy || archived}
          onClick={onTogglePinned}
        />
        <MenuItem
          testId="toggle-favorite"
          label={favorite ? "Remove favorite" : "Add to favorites"}
          disabled={busy}
          onClick={onToggleFavorite}
        />
        {!hideLifecycleActions && (
          <>
        <MenuItem
          testId="toggle-archived"
          label={archived ? "Restore to active notes" : "Archive note"}
          disabled={busy}
          onClick={onToggleArchived}
        />
        <MenuItem
          testId="duplicate-note"
          label="Duplicate note"
          disabled={busy}
          onClick={onDuplicate}
        />
        <MenuItem
          testId="move-to-trash"
          label="Move to trash"
          destructive
          disabled={busy}
          onClick={onMoveToTrash}
        />
          </>
        )}
      </div>
    </ToolbarMenu>
  );
}
