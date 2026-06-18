import { RESOLVED_COPY, isNoteResolved } from "@/lib/notes/resolved-labels";
import {
  IconArchive,
  IconPin,
  IconResolved,
  IconStar,
  IconTrash,
  IconUnresolved,
} from "@/components/notes/note-state-icons";
import { cn } from "@/lib/ui/cn";

interface NoteStateIndicatorsProps {
  answered: boolean;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  trashed?: boolean;
  className?: string;
  /** When set, slots become toggle buttons (detail view). */
  interactive?: boolean;
  resolving?: boolean;
  onTogglePinned?: () => void;
  onToggleFavorite?: () => void;
  onToggleResolved?: () => void;
}

interface StateSlotProps {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeTestId: string;
  inactiveTestId: string;
  activeIcon: React.ReactNode;
  inactiveIcon?: React.ReactNode;
  hideWhenInactive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

function StateSlot({
  active,
  activeLabel,
  inactiveLabel,
  activeTestId,
  inactiveTestId,
  activeIcon,
  inactiveIcon,
  hideWhenInactive = false,
  onClick,
  disabled = false,
}: StateSlotProps) {
  const icon = active ? activeIcon : (inactiveIcon ?? activeIcon);
  const className = cn(
    "note-state-indicators__slot",
    active ? "note-state-indicators__slot--active" : "note-state-indicators__slot--inactive",
    hideWhenInactive && !active && "note-state-indicators__slot--hidden",
    onClick && "note-state-indicators__slot--interactive"
  );
  const label = active ? activeLabel : inactiveLabel;
  const testId = active ? activeTestId : inactiveTestId;

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        data-testid={testId}
        aria-label={label}
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }}
      >
        {icon}
      </button>
    );
  }

  return (
    <span className={className} data-testid={testId} aria-label={label}>
      {icon}
    </span>
  );
}

/**
 * Fixed-order lifecycle indicators: pinned → favorite → resolved/unresolved.
 * Archived/trash render after the fixed trio without shifting slot positions.
 */
export function NoteStateIndicators({
  answered,
  pinned = false,
  favorite = false,
  archived = false,
  trashed = false,
  className,
  interactive = false,
  resolving = false,
  onTogglePinned,
  onToggleFavorite,
  onToggleResolved,
}: NoteStateIndicatorsProps) {
  const resolved = isNoteResolved(answered);
  const showActiveMarkers = !archived && !trashed;

  return (
    <span
      className={cn("note-state-indicators note-state-indicators--fixed", className)}
      data-testid="note-state-indicators"
    >
      <span className="note-state-indicators__core" data-testid="note-state-indicators-core">
        <StateSlot
          active={showActiveMarkers && pinned}
          activeLabel="Pinned note"
          inactiveLabel="Not pinned"
          activeTestId="note-pinned-badge"
          inactiveTestId="note-pinned-slot"
          activeIcon={<IconPin />}
          hideWhenInactive={!showActiveMarkers && !interactive}
          onClick={interactive ? onTogglePinned : undefined}
          disabled={resolving}
        />
        <StateSlot
          active={showActiveMarkers && favorite}
          activeLabel="Favorite note"
          inactiveLabel="Not favorite"
          activeTestId="note-favorite-badge"
          inactiveTestId="note-favorite-slot"
          activeIcon={<IconStar />}
          hideWhenInactive={!showActiveMarkers && !interactive}
          onClick={interactive ? onToggleFavorite : undefined}
          disabled={resolving}
        />
        <StateSlot
          active={resolved}
          activeLabel={
            interactive
              ? RESOLVED_COPY.markUnresolved
              : RESOLVED_COPY.resolvedBadge
          }
          inactiveLabel={interactive ? RESOLVED_COPY.markResolved : RESOLVED_COPY.unresolved}
          activeTestId="note-resolved-indicator"
          inactiveTestId="note-unresolved-indicator"
          activeIcon={<IconResolved />}
          inactiveIcon={<IconUnresolved />}
          onClick={interactive ? onToggleResolved : undefined}
          disabled={resolving}
        />
      </span>
      {archived && (
        <span
          className="note-state-indicators__lifecycle"
          data-testid="note-archived-badge"
          aria-label="Archived note"
          title="Archived note"
        >
          <IconArchive />
        </span>
      )}
      {trashed && (
        <span
          className="note-state-indicators__lifecycle"
          data-testid="note-trashed-badge"
          aria-label="Note in trash"
          title="Note in trash"
        >
          <IconTrash />
        </span>
      )}
    </span>
  );
}
