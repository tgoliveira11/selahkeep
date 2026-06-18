import Link from "next/link";
import { RESOLVED_COPY, isNoteResolved } from "@/lib/notes/resolved-labels";
import { formatNoteListDates } from "@/lib/notes/note-dates";
import { Badge } from "@/components/ui/badge";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { NoteResolvedToggle } from "@/components/notes/note-resolved-toggle";
import { cn } from "@/lib/ui/cn";

interface NoteCardProps {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  answered: boolean;
  categoryName?: string | null;
  tagNames?: string[];
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
  categoryName,
  tagNames = [],
  locked,
  resolving = false,
  onToggleResolved,
}: NoteCardProps) {
  const resolved = isNoteResolved(answered);

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-md",
        resolved && "border-[var(--success)]/25 bg-[var(--success-muted)]/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/notes/${id}`}
          className={cn(
            "min-w-0 flex-1 rounded-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
            resolved && "opacity-90"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("truncate font-medium", locked && "text-[var(--muted)]", resolved && "text-[var(--muted)]")}>
              {title}
            </p>
            {resolved ? (
              <Badge variant="success">{RESOLVED_COPY.resolvedBadge}</Badge>
            ) : (
              <Badge variant="muted">{RESOLVED_COPY.unresolved}</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {categoryName && <NoteCategoryLabel name={categoryName} />}
            {tagNames.map((name) => (
              <NoteTagChip key={name} name={name} />
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {formatNoteListDates(createdAt, updatedAt)}
          </p>
        </Link>

        {onToggleResolved && (
          <NoteResolvedToggle
            answered={answered}
            resolving={resolving}
            onToggle={onToggleResolved}
          />
        )}
      </div>
    </div>
  );
}
