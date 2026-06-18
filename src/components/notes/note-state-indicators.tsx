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
  /** When true, include resolved/unresolved icon in the cluster (card mode). */
  includeResolved?: boolean;
  className?: string;
}

/**
 * Compact lifecycle indicators shared by card and list note surfaces.
 * Pinned/favorite only show for active notes; archived/trash show when applicable.
 */
export function NoteStateIndicators({
  answered,
  pinned = false,
  favorite = false,
  archived = false,
  trashed = false,
  includeResolved = false,
  className,
}: NoteStateIndicatorsProps) {
  const resolved = isNoteResolved(answered);
  const showActiveMarkers = !archived && !trashed;
  const items: Array<{ key: string; label: string; icon: React.ReactNode; testId: string }> = [];

  if (includeResolved) {
    items.push({
      key: "resolved",
      label: resolved ? RESOLVED_COPY.resolvedBadge : RESOLVED_COPY.unresolved,
      icon: resolved ? <IconResolved /> : <IconUnresolved />,
      testId: resolved ? "note-resolved-indicator" : "note-unresolved-indicator",
    });
  }

  if (showActiveMarkers && pinned) {
    items.push({
      key: "pinned",
      label: "Pinned note",
      icon: <IconPin />,
      testId: "note-pinned-badge",
    });
  }

  if (showActiveMarkers && favorite) {
    items.push({
      key: "favorite",
      label: "Favorite note",
      icon: <IconStar />,
      testId: "note-favorite-badge",
    });
  }

  if (archived) {
    items.push({
      key: "archived",
      label: "Archived note",
      icon: <IconArchive />,
      testId: "note-archived-badge",
    });
  }

  if (trashed) {
    items.push({
      key: "trashed",
      label: "Note in trash",
      icon: <IconTrash />,
      testId: "note-trashed-badge",
    });
  }

  if (items.length === 0) return null;

  return (
    <span
      className={cn("note-state-indicators", className)}
      data-testid="note-state-indicators"
    >
      {items.map((item) => (
        <span
          key={item.key}
          className="note-state-indicators__item"
          data-testid={item.testId}
          title={item.label}
          aria-label={item.label}
        >
          {item.icon}
        </span>
      ))}
    </span>
  );
}
