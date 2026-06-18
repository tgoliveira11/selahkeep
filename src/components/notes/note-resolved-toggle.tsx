import { RESOLVED_COPY, isNoteResolved } from "@/lib/notes/resolved-labels";
import { cn } from "@/lib/ui/cn";

interface NoteResolvedToggleProps {
  answered: boolean;
  resolving?: boolean;
  onToggle: () => void;
  className?: string;
}

function ResolvedToggleIcon({ resolved }: { resolved: boolean }) {
  return resolved ? (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function NoteResolvedToggle({
  answered,
  resolving = false,
  onToggle,
  className,
}: NoteResolvedToggleProps) {
  const resolved = isNoteResolved(answered);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)]",
        "text-[var(--muted)] transition-colors hover:bg-[var(--card-muted)] hover:text-[var(--foreground)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        resolving && "cursor-wait opacity-60",
        className
      )}
      aria-label={resolved ? RESOLVED_COPY.markUnresolved : RESOLVED_COPY.markResolved}
      disabled={resolving}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <ResolvedToggleIcon resolved={resolved} />
    </button>
  );
}
