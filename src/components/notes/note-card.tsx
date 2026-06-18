import Link from "next/link";
import { RESOLVED_COPY, isNoteResolved } from "@/lib/notes/resolved-labels";
import { Badge } from "@/components/ui/badge";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { cn } from "@/lib/ui/cn";

interface NoteCardProps {
  id: string;
  title: string;
  createdAt: string;
  answered: boolean;
  categoryName?: string | null;
  tagNames?: string[];
  locked?: boolean;
}

export function NoteCard({
  id,
  title,
  createdAt,
  answered,
  categoryName,
  tagNames = [],
  locked,
}: NoteCardProps) {
  return (
    <Link
      href={`/notes/${id}`}
      className={cn(
        "block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4",
        "shadow-[var(--shadow-sm)] transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium", locked && "text-[var(--muted)]")}>{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {categoryName && <NoteCategoryLabel name={categoryName} />}
            {tagNames.map((name) => (
              <NoteTagChip key={name} name={name} />
            ))}
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {new Date(createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        {isNoteResolved(answered) && <Badge variant="success">{RESOLVED_COPY.resolvedBadge}</Badge>}
      </div>
    </Link>
  );
}
