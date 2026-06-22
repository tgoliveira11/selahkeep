import Link from "next/link";
import { isNoteResolved } from "@/lib/notes/resolved-labels";
import { formatNoteUpdatedShort } from "@/lib/notes/note-dates";
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

/**
 * Note card — "Stillness" design (docs/DESIGN_SYSTEM.md, hero specs):
 * header row (outlined category pill · Resolved badge · pin/state actions),
 * title, two-line excerpt, footer (tag chips · updated date).
 */
export function NoteCard({
  id,
  title,
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
  const resolved = isNoteResolved(answered);
  const q = searchQuery.trim();

  return (
    <div
      className="note-card rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-[15px] transition-shadow hover:shadow-[var(--shadow-md)]"
      data-testid="note-card"
    >
      {/* header row: category · resolved · actions */}
      <div className="mb-2.5 flex items-center gap-2">
        {categoryName && <NoteCategoryLabel name={categoryName} />}
        {resolved && (
          <span
            aria-label="Resolved"
            className="inline-flex items-center gap-1 rounded-md border border-[var(--success-bd)] bg-[var(--success-bg)] px-2 py-[3px] text-[11px] font-semibold text-[var(--success)]"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Resolved
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <NoteStateIndicators
            answered={false}
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

      <Link
        href={`/notes/${id}`}
        className="block rounded-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <p
          className={cn(
            "text-base font-semibold tracking-[-0.01em]",
            locked && "text-[var(--muted)]"
          )}
        >
          {q ? <HighlightedText text={title} query={searchQuery} /> : title}
        </p>

        {q && bodySnippet ? (
          <SearchResultSnippet
            snippet={bodySnippet}
            query={searchQuery}
            className="mt-1.5 line-clamp-2"
          />
        ) : (
          !q &&
          bodyExcerpt &&
          !locked && (
            <p
              className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--fg-2)]"
              data-testid="note-card-excerpt"
            >
              {bodyExcerpt}
            </p>
          )
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5" data-testid="note-card-metadata">
            {tagNames.map((name) => (
              <NoteTagChip key={name} name={name} />
            ))}
          </div>
          <span className="shrink-0 text-[11.5px] text-[var(--muted)]">
            {formatNoteUpdatedShort(updatedAt)}
          </span>
        </div>
      </Link>
    </div>
  );
}
