import { formatTagDisplay } from "@/lib/notes/tag-normalization";
import { cn } from "@/lib/ui/cn";

interface NoteCategoryLabelProps {
  name: string;
  className?: string;
}

/** Outlined category pill (Stillness — docs/DESIGN_SYSTEM.md). */
export function NoteCategoryLabel({ name, className }: NoteCategoryLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-[var(--border-2)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]",
        className
      )}
    >
      <span aria-hidden="true">📁</span>
      <span>{name}</span>
    </span>
  );
}

interface NoteTagChipProps {
  name: string;
  className?: string;
  onRemove?: () => void;
}

export function NoteTagChip({ name, className, onRemove }: NoteTagChipProps) {
  const label = formatTagDisplay(name);

  if (onRemove) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]",
          className
        )}
      >
        <span>{label}</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-1 text-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label={`Remove tag ${label}`}
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]",
        className
      )}
    >
      {label}
    </span>
  );
}
