import Link from "next/link";
import { isNoteResolved } from "@/lib/notes/resolved-labels";
import { formatNoteListDates } from "@/lib/notes/note-dates";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { NoteStateIndicators } from "@/components/notes/note-state-indicators";
import { NoteResolvedToggle } from "@/components/notes/note-resolved-toggle";
import { HighlightedText } from "@/components/notes/search-highlight";
import { SearchResultSnippet } from "@/components/notes/search-result-snippet";
import { cn } from "@/lib/ui/cn";

interface NoteCardProps {
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
  bodySnippet?: string | null;
  bodyExcerpt?: string | null;
  locked?: boolean;
  resolving?: boolean;
  onToggleResolved?: () => void;
}

export function NoteCard({
  id,
  title,
  createdAt,
  updatedAt,
  answered,
  pinned = false,
  favorite = false,
  archived = false,
  trashed = false,
  categoryName,
  tagNames = [],
  searchQuery = "",
  bodySnippet,
  bodyExcerpt,
  locked,
  resolving = false,
  onToggleResolved,
}: NoteCardProps) {
  return (
    <div
      className={cn(
        "note-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-md",
        isNoteResolved(answered) &&
          "note-card--resolved border-[var(--success)]/30 bg-[color-mix(in_srgb,var(--success-muted)_18%,var(--card))]"
      )}
      data-testid="note-card"
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/notes/${id}`}
          className="min-w-0 flex-1 rounded-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          <p className={cn("truncate font-medium", locked && "text-[var(--muted)]")}>
            {searchQuery.trim() ? (
              <HighlightedText text={title} query={searchQuery} />
            ) : (
              title
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="note-card-metadata">
            {categoryName && <NoteCategoryLabel name={categoryName} />}
            {tagNames.map((name) => (
              <NoteTagChip key={name} name={name} />
            ))}
          </div>
          {bodySnippet && searchQuery.trim() && (
            <SearchResultSnippet
              snippet={bodySnippet}
              query={searchQuery}
              className="mt-2 line-clamp-2"
            />
          )}
          {!searchQuery.trim() && bodyExcerpt && !locked && (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]" data-testid="note-card-excerpt">
              {bodyExcerpt}
            </p>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            {formatNoteListDates(createdAt, updatedAt)}
          </p>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <NoteStateIndicators
            answered={answered}
            pinned={pinned}
            favorite={favorite}
            archived={archived}
            trashed={trashed}
          />
          {onToggleResolved && !trashed && (
            <NoteResolvedToggle
              answered={answered}
              resolving={resolving}
              onToggle={onToggleResolved}
            />
          )}
        </div>
      </div>
    </div>
  );
}
