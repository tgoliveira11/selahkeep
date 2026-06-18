import Link from "next/link";
import { isNoteResolved } from "@/lib/notes/resolved-labels";
import { formatNoteUpdatedShort } from "@/lib/notes/note-dates";
import { NoteStateIndicators } from "@/components/notes/note-state-indicators";
import { NoteResolvedToggle } from "@/components/notes/note-resolved-toggle";
import { HighlightedText } from "@/components/notes/search-highlight";
import { cn } from "@/lib/ui/cn";

interface NoteListRowProps {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  answered: boolean;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  trashed?: boolean;
  categoryName?: string | null;
  tagNames?: string[];
  searchQuery?: string;
  locked?: boolean;
  resolving?: boolean;
  onToggleResolved?: () => void;
}

export function NoteListRow({
  id,
  title,
  updatedAt,
  answered,
  pinned = false,
  favorite = false,
  archived = false,
  trashed = false,
  categoryName,
  searchQuery = "",
  locked,
  resolving = false,
  onToggleResolved,
}: NoteListRowProps) {
  const resolved = isNoteResolved(answered);

  return (
    <article
      className={cn("note-list-row", resolved && "note-list-row--resolved")}
      data-testid="note-list-row"
    >
      <Link
        href={`/notes/${id}`}
        className={cn("note-list-row__title", locked && "text-[var(--muted)]")}
        aria-label={`Open note: ${title}`}
      >
        {searchQuery.trim() ? <HighlightedText text={title} query={searchQuery} /> : title}
      </Link>

      <span className="note-list-row__category">{categoryName ?? ""}</span>

      <time className="note-list-row__date" dateTime={updatedAt}>
        {formatNoteUpdatedShort(updatedAt)}
      </time>

      <NoteStateIndicators
        answered={answered}
        pinned={pinned}
        favorite={favorite}
        archived={archived}
        trashed={trashed}
        className="note-list-row__indicators"
      />

      <div className="note-list-row__action">
        {onToggleResolved && !trashed ? (
          <NoteResolvedToggle answered={answered} resolving={resolving} onToggle={onToggleResolved} />
        ) : (
          <span className="note-list-row__action-spacer" aria-hidden />
        )}
      </div>
    </article>
  );
}
